import {AbstractTypiePackage, AppGlobal, TypieRowItem, Typie} from "typie-sdk";
import Path from "path";
import axios, {AxiosPromise} from "axios";
import download from "download-git-repo";
import fs from "fs-extra";

export default class SubSystemInstall extends AbstractTypiePackage {

    constructor(win, config, pkgPath) {
        super(win, config, pkgPath);
        this.packageName = "System->Install";
        this.db = "System";
        this.typie = new Typie(this.packageName, "System");
        this.icon = "themes/default/images/icons/icon.png";
    }

    public activate(pkgList, item, cb) {
        console.log("activate install", item.getPath());
        this.win.send("listLoading", {data: "Downloading Package...", length: 0, err: 0});
        const pkgDir = Path.join(AppGlobal.get("staticPath"), "packages/" + item.getTitle());
        fs.removeSync(pkgDir);
        download(item.getPath(), pkgDir, (err) => {
            if (err) {
                console.error(err);
            }
            AppGlobal.get("PackageLoader").loadPackage(item.getTitle());
            this.win.send("resultList", {data: [], length: 0, err: 0});
        });
    }

    public enterPkg(pkgList, item, cb) {
        this.win.send("listLoading", {data: "Loading...", length: 0, err: 0});
        axios.get("https://api.github.com/users/typie/repos")
            .then(res => {
                const repos = res.data;
                const reposToFetch: any = [];
                for (const repo of repos) {
                    if (repo.name.endsWith("-pkg")) {
                        reposToFetch.push(repo);
                    }
                }
                this.fetchAllPkgs(reposToFetch);
            })
            .catch(e => console.log(e));
    }

    public fetchAllPkgs(reposToFetch) {
        const promises: Array<AxiosPromise<any>> = [];
        const availablePkgs = {};
        for (const repo of reposToFetch) {
            const url = "https://raw.githubusercontent.com/" + repo.full_name + "/master/package.json";
            promises.push(axios.get(url));
        }
        axios.all(promises).then((results) => {
            for (const res of results) {
                if (res.status === 200) {
                    availablePkgs[res.data.name] = res.data;
                }
            }
            this.buildResultList(availablePkgs);
        });
    }

    private buildResultList(pkgs) {
        const resultList: TypieRowItem[] = [];
        for (const pkg in pkgs) {
            if (pkgs.hasOwnProperty(pkg)) {
                resultList.push(
                    new TypieRowItem(pkgs[pkg].typie.title)
                        .setDB(this.db)
                        .setPackage(this.packageName)
                        .setDescription(pkgs[pkg].typie.description)
                        .setIcon(this.icon)
                        .setPath("typie/" + pkg));
            }
        }

        this.win.send("resultList", {data: resultList, length: resultList.length, err: 0});
        this.typie.multipleInsert(resultList).go().then().catch();
    }
}
