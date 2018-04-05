const {shell} = require('electron');
const skullIco = 'themes/default/images/skull.png';
const {AbstractHastePackage, HasteRowItem} = require('haste-sdk');

class MovieSearch extends AbstractHastePackage
{

    constructor(Haste, win, pkgPath){
        super(pkgPath);
        this.packageName = 'MovieSearch';
        this.haste       = new Haste(this.packageName);

        // Example
        this.insert('supernatural');
        this.insert('the walking dead');
    }

    insert(value, description="", path="", icon="") {
        let item = this.getDefaultItem(value, description, path, icon);
        item.setDescription("Activate to search");
        this.insertItem(item);
    }

    activate(item, cb) {
        this.haste.updateCalled(item).go();
        let eleet = 'http://1337x.to/sort-search/'+item.title+'/seeders/desc/1/';
        let imdb = 'https://www.imdb.com/find?s=all&q='+item.title+'';
        let youtube = 'https://www.youtube.com/results?search_query='+item.title+'';
        let subscene = 'https://subscene.com/subtitles/title?q='+item.title+'&l=';
        let opensubs = 'https://www.opensubtitles.org/en/search2/sublanguageid-all/moviename-'+item.title+'';
        shell.openItem(opensubs);
        shell.openItem(subscene);
        shell.openItem(youtube);
        shell.openItem(imdb);
        shell.openItem(eleet);
        //this.win.send('action', 'hide');
    }
}
module.exports = MovieSearch;

