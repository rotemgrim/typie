
import fs from "fs";
import Path from "path";
import * as yaml from "js-yaml";
import {app} from "electron";
import AppGlobal from "../helpers/AppGlobal";
import {EventEmitter} from 'events';

export default class Settings extends EventEmitter
{
    private settingsPath: string;
    private isLoading: boolean;
    private isWatching: boolean;
    private settings: object;

    constructor() {
        super();
        this.settings = {};
        this.settingsPath = Path.join(app.getPath('userData'), 'config.yml');
        this.isLoading = true;
        this.isWatching = false;
        this.loadSettings();
    }

    public getEntry(name: string): object | null {
        if (this.settings[name]) {
            return this.settings[name];
        }
        return null;
    }

    public writeEntry(name: string, data: object): void {
        this.settings[name] = data;
        this.writeToFile();
    }

    /**
     * this function will load the default pkg config that placed
     * in the package directory. if there already an entry in the main config
     * then it will use it and won't load the defaults.
     * @param pkgName
     * @param pkgPath
     */
    loadPkgConfig(pkgName, pkgPath): any {
        let pkgConfig = {};
        if (this.getEntry(pkgName)) {
            console.log("Loading '"+pkgName+"' config from user config");
            return this.getEntry(pkgName);
        } else {
            console.log("Loading '"+pkgName+"' config from defaults");
            try {
                pkgConfig = yaml.safeLoad(fs.readFileSync(Path.join(Path.join("static", pkgPath), 'defaultConfig.yml'), 'utf8'));
                this.writeEntry(pkgName, pkgConfig);
            } catch (err) {
                console.error("Missing 'defaultConfig.yml' file for "+ pkgName)
                //console.error(err);
            }
        }
        return pkgConfig;
    }

    private createIfNotExist(): void {
        let settings = {};
        if (fs.existsSync(this.settingsPath)) {
            console.log('Loading Settings File...');
            settings = yaml.safeLoad(fs.readFileSync(this.settingsPath, 'utf8'));
            if (this.isWatching) {
                // test for withc package had changed and send event.
                Object.keys(settings).forEach((key) => {
                    console.log(key, settings[key]);
                    if (JSON.stringify(this.settings[key]) !== JSON.stringify(settings[key])) {
                        this.emit('reloadPackage', key);
                    }
                });
            }
        } else {
            settings = {
                version: "Haste 2.0"
            };
            console.log('Creating New Settings File...');
            this.writeToFile();
        }
        this.settings = settings;
        AppGlobal.settings = this.settings;
        console.log('settings loaded:', this.settings);
        this.isLoading = false;
    }

    private watchFile(): void {
        if (!this.isWatching && !this.isLoading) {
            this.isWatching = true;
            fs.watch(this.settingsPath, (event, path) => {
                if (!this.isLoading) {
                    this.isLoading = true;
                    console.log('Settings file ' + event +' detected at ', path);
                    this.loadSettings();
                }
            });
        }
    }

    private loadSettings(): void {
        try {
            this.createIfNotExist();
            this.watchFile();
        } catch (e) {
            console.error(e);
            throw new Error('Error loading config.yml file, check if exist or is valid Yaml format.');
        }
    }

    private writeToFile() {
        fs.writeFileSync(this.settingsPath, yaml.safeDump(this.settings));
    }
}