import fs from "fs";
import {AbstractTypiePackage, AppGlobal, Typie, TypieRowItem} from "typie-sdk";
import * as Path from "path";
import MainWindowController from "../controllers/MainWindowController";
import {getDirectories, getRelativePath} from "../helpers/HelperFunc";
import ConfigLoader from "./ConfigLoader";
import System from "../packages/system/System";
import npm from "npm";

declare const __static: any;
const packagesPath = Path.join(__static, "/packages");

export default class PackageLoader {

    private packages: object;
    private win: MainWindowController;
    private config: ConfigLoader;

    constructor(win: MainWindowController, config: ConfigLoader) {
        this.win = win;
        this.config = config;
        this.packages = {};

        this.loadSystemPkg();
        this.loadPackages();
        // this.watchForPackages();
        config.on("reloadPackage", pkgName => this.loadPackage(pkgName));
        AppGlobal.set("PackageLoader", this);
    }

    public getPackage(pkg: string): Promise<AbstractTypiePackage> {
        return new Promise<AbstractTypiePackage>((resolve, reject) => {
            if (this.packages[pkg]) {
                resolve(this.packages[pkg]);
            } else {
                reject("package loader did not find: '" + pkg + "' pkg");
            }
        });
    }

    public getPackageFromList(pkgList: string[]): Promise<AbstractTypiePackage> {
        if (pkgList.length === 1) {
            return this.getPackage(pkgList[0]);
        } else if (pkgList.length > 1) {
            let pkg: any = this;
            return new Promise<AbstractTypiePackage>((resolve, reject) => {
                while (pkgList.length >= 1) {
                    const pk: any = pkgList.shift();
                    if (pkg.packages[pk]) {
                        pkg = pkg.packages[pk];
                    } else {
                        reject("package loader did not find: '" + pk + "' pkg in " + pkg.getPackageName());
                    }
                }
                resolve(pkg);
            });
        } else {
            return new Promise<AbstractTypiePackage>((resolve, reject) =>
                reject("cannot get package with empty pkgList"));
        }
    }

    public loadPackages() {
        const packagesDirs = getDirectories(packagesPath);
        console.log(packagesDirs);
        packagesDirs.forEach((dirName) => {
            this.loadPackage(dirName);
        });
    }

    public loadPackage(dirName) {
        const absPath = Path.join(packagesPath, dirName);
        const staticPath = "packages/" + dirName + "/";
        if (!this.isViablePackage(absPath)) {
            return;
        }

        const relativePath = getRelativePath(absPath);
        const pkJson = this.getPackageJsonFromPath(absPath);
        const packageName = pkJson.typie.title;

        this.destroyIfExist(packageName);
        console.log("Loading package from " + relativePath);

        Promise.all([
            this.installDependencies(absPath),
            (new Typie(packageName)).addCollection().go(),
        ]).then(data => {
            const pkgConfig = this.config.loadPkgConfig(packageName, absPath);
            const Package = eval("require('" + relativePath + "/index.js')");
            this.packages[packageName] = new Package(this.win, pkgConfig, packageName);
            this.addPkgToGlobal(packageName);
        }).catch((err) => console.error("cannot load package from: " + relativePath, err));
    }

    public addPkgToGlobal(pkgName) {
        console.log("Loaded package '" + pkgName + "'");
        this.globalInsertPackage(
            new TypieRowItem(pkgName)
                .setDB("global")
                .setPackage(pkgName)
                .setDescription("Package")
                .setIcon(this.packages[pkgName].icon));
    }

    public installDependencies(absPath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(Path.join(absPath, "node_modules"))) {
                console.log("installing dependencies");
                npm.load({}, (er) => {
                    if (er) { reject(er); }
                    npm.commands.install(absPath, [], (err, data) => {
                        if (err) { reject(err); }
                        resolve(data);
                    });
                });
            } else {
                resolve();
            }
        });
    }

    public isViablePackage(absPath): boolean {
        if (!fs.existsSync(Path.join(absPath, "index.js"))) {
            console.error("Did not found index.js at " + absPath);
            return false;
        }
        if (!fs.existsSync(Path.join(absPath, "package.json"))) {
            console.error("Did not found package.json at " + absPath);
            return false;
        }
        return true;
    }

    public getPackageJsonFromPath(absPath): any {
        const pkJson = JSON.parse(fs.readFileSync(absPath + "/package.json", "utf8"));
        return pkJson;
    }

    public destroyIfExist(packageName): void {
        const pkg: AbstractTypiePackage = this.packages[packageName];
        if (pkg) {
            console.log("package '" + packageName + "' already exist...");
            pkg.destroy();
            delete this.packages[packageName];
        }
    }

    // watchForPackages() {
    //     // if its a process that copying files wait for it to finish
    //     let placeHolder;
    //     fs.watch(packagesPath, (event, dirPath) => {
    //         clearTimeout(placeHolder);
    //         placeHolder = setTimeout(() => {
    //             console.log("Detect package '"+event+"', reloading '"+dirPath+"'");
    //             this.loadPackage(dirPath);
    //         }, 2000);
    //     });
    // }

    private loadSystemPkg() {
        const pkgName = "System";
        (new Typie(pkgName)).addCollection().go()
            .then(() => {
                this.packages[pkgName] = new System(this.win, [], pkgName);
                this.addPkgToGlobal(pkgName);
            }).catch(e => console.error(e));
    }

    private globalInsertPackage(item: TypieRowItem) {
        new Typie(item.getPackage(), "global").insert(item, false).go()
            .then(res => {
                if (res.err === 0) {
                    console.log("Package '" + item.getTitle() + "' is now searchable.");
                }
            })
            .catch(err => console.error(err));
    }
}
