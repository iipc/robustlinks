// robustlinks.js
// @author Yorick Chollet <yorick.chollet@gmail.com>
// @author Harihar Shankar <hariharshankar@gmail.com>
// @author Shawn M. Jones <jones.shawn.m@gmail.com>
// @version 2.0
// License can be obtained at http://mementoweb.github.io/SiteStory/license.html 

// Determining what is a URL. In this case, either a relative path or a HTTP/HTTPS scheme.

var RobustLinks = (function() {

    // Web archives that rewrite memento URLs already robustify links.
    // This list includes base URIs of web archives that rewrite memento urls.
    // DO NOT EDIT!
    var RLWebArchiveBaseUriToExclude = [
        "https?://web.archive.org/web/*", // Internet Archive
        "https?://wayback.archive-it.org/11112/*", // PRONI
        "https?://web.archive.bibalex.org/web/*", // Bibliotheca Alexandrina Web Archive
        "https?://www.webarchive.org.uk/wayback/en/archive/*", // UK Web Archive
        "https?://langzeitarchivierung.bib-bvb.de/wayback/*,", // Bayerische Staatsbibliothek 
        "https?://webcitation.org/", // Web Cite
        "https?://webarchive.loc.gov/all/*", // Library of Congress
        "https?://wayback.archive-it.org/all/*", // Archive-It (all collection)
        "https?://wayback.archive-it.org/[0-9]+/*", // Archive-It (any collection)
        "https?://webarchive.parliament.uk/[0-9]+/*", // UK Parliament Web Archive (in pywb frame)
        "https?://webarchive.parliament.uk/[0-9]+tf_/*", // UK Parliament Web Archive (outside pywb frame)
        "https?://webarchive.nationalarchives.gov.uk/[0-9]+/*", // UK National Archives Web Archive (in pywb frame)
        "https?://webarchive.nationalarchives.gov.uk/[0-9]+tf_/*", // UK National Archives Web Archive (outside pywb frame)
        "https?://archive.li/*", // Archive.Today
        "https?://archive.vn/*", // Archive.Today
        "https?://archive.fo/*", // Archive.Today
        "https?://archive.md/*", // Archive.Today
        "https?://archive.ph/*", // Archive.Today
        "https?://archive.today/*", // Archive.Today
        "https?://archive.is/*", // Archive.Today
        "https?://waext.banq.qc.ca/wayback/[0-9]+/*", // Bibliothèque et Archives nationale du Québec
        "https?://haw.nsk.hr/arhiva/*", // Croatian Web Archive
        "https?://wayback.webarchiv.cz/wayback/[0-9]+/*", // Webarchiv (the Museum of Czech web)
        "https?://wayback.vefsafn.is/wayback/[0-9]+/*", // Icelandic Web Archive
        "https?://arquivo.pt/wayback/[0-9]+/*", // Arquivo.pt
        "https?://arquivo.pt/wayback/[0-9]+if_/*", // Arquivo.pt (outside pywb frame)
        "https?://perma-archives.org/warc/[0-9]+/*", // Perma.cc (datetime in URI-M)
        "https?://perma.cc/*", // Perma.cc (identifier in URI-M)
        "https?://wayback.padicat.cat/wayback/[0-9]+/*", // Catalonia Archive
        "https?://archive.aueb.gr/services/web/[0-9]+/*", // Athens University of Economics and Business (AUEB)
        "https?://digital.library.yorku.ca/wayback/[0-9]+/*", // York University Libraries
        "https?://veebiarhiiv.digar.ee/a/[0-9]+/*", // Estonian Archive
        "https?://wayback.archive-it.org/10702/*", // Natioanl Library of Ireland
        "https?://webarchive.nrscotland.gov.uk/[0-9]+/*", // National Records of Scotland
        "https?://nukrobia.nuk.uni-lj.si:8080/wayback/[0-9]+/*", // Slovenian Archive
        "https?://swap.stanford.edu/[0-9]+/*" // Stanford Web Archive
    ];

    var RLIsURL = function(href) {
        try {
            var url = new URL(href);
            return true; // we survived to get here
        } catch(err) {
            return false; // not a URL
        }
    }
    
    // Adds leading '0' to numbers
    // From http://www.w3schools.com/jsref/jsref_gethours.asp
    var RLAddZero = function(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }
    
    // Keeps track of the last open menu to close it.
    var RLLastOpen;
    var RLCloseLastOpen = function(){
        if(RLLastOpen){
            RLLastOpen.setAttribute('aria-hidden', 'true');
            RLLastOpen = null;
        }
    }
    
    // Creates a pseudorandom unique ID
    // from https://gist.github.com/gordonbrander/2230317
    var RL_ID = function() {
        return 'RL_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Appends creates a list-item link to `uri` with `text` and appends it to `parent`
    var RL_appendHiddenLink = function(parent, text, uri) {
        var listItem = document.createElement('li');
        var linkItem = document.createElement('div');
        var listLink = document.createElement('a');
        listLink.setAttribute('class', 'robustLinks RLItem');
        listLink.href = uri;
        listLink.innerHTML = text;
    
        linkItem.appendChild(listLink);
        listItem.appendChild(linkItem);
        parent.appendChild(listItem);
    }
    
    // Formats the dateStr in the aggregator format YYYYMMDDHHmmSS
    var RLFormatDate = function(dateStr) {
        var date = new Date(dateStr);
        if(isNaN(date)){
            // Tires to fix the date before passing it to rigourous parsers (e.g. Mozilla)
            date = new Date(dateStr.replace(/ /g,'T'));
            if(isNaN(date)){
                return 'Invalid date';
            }
        }
        var datestring = '';
        datestring += date.getUTCFullYear();
        datestring += RLAddZero(date.getUTCMonth()+1);//  getMonth start at 0
        datestring += RLAddZero(date.getUTCDate());
        datestring += RLAddZero(date.getUTCHours());
        datestring += RLAddZero(date.getUTCMinutes());
        datestring += RLAddZero(date.getUTCSeconds());
        return datestring;
    }
    
    // Formats the dateStr in the readable format YYYY-MM-DD HH:mm:SS
    var RLPrintDate = function(dateStr){
        var formatted = RLFormatDate(dateStr);
        var date = formatted.substr(0, 4) + '-' + formatted.substr(4, 2)+ '-' + formatted.substr(6, 2);
    
        if (formatted.substr(8, 6) != '000000'){
            date += ' '+formatted.substr(8, 2) + ':' + formatted.substr(10, 2)+ ':' + formatted.substr(12, 2);
        }
        return date;
    }
    
    // Extracts information 
    var RLGetAttribute = function(obj, str){
        try{
            return obj.getAttribute(str).trim();
        } catch(err) {
            return "";
        }
    }

    var robustify_links_on_page = function() {

        var spans = document.getElementsByTagName("span");
    
        for (var i=spans.length - 1; i >=0; i--) {
            
            ariaLabel = RLGetAttribute(spans[i], "aria-label");
            role = RLGetAttribute(spans[i], "role");
    
            if ( ( ariaLabel == 'RLElement') && ( role = "navigation" ) ) {
                spans[i].parentNode.removeChild(spans[i]);
            }
        }
    
        // For every <a> link
        var links = document.getElementsByTagName("a");

        console.log("links...");
        console.log(links);
        
        for(var i=0; i<links.length; i++) {
    
            // Extracts link information
            var linkHREF =  RLGetAttribute(links[i], 'href');

            console.log("linkHREF: " + linkHREF);
            
            if (!linkHREF.search("http") == 0) {   
                linkHREF = new URL(linkHREF, window.location.href).href;
            }
    
            // The original is either in the attribute or in the href
            var original =  RLGetAttribute(links[i], 'data-originalurl');
            var hasOriginal = Boolean(original);
    
            if (!hasOriginal){
                original = linkHREF;
            }
            
            // The memento url is either data-versionurl or in the href if data-originalurl exists
            var memento =  RLGetAttribute(links[i], 'data-versionurl');
            
            var hasMemento = Boolean(memento);
    
            if(!hasMemento && hasOriginal) {
                memento = linkHREF;
            }
    
            // The datetime is the data-versiondate
            var datetime = RLGetAttribute(links[i], 'data-versiondate');
            
            var hasDatetime = Boolean(datetime);
    
            var showLink  = (
                links[i].href.length > 0 &&  // no inner/empty links
                (' ' + links[i].className+' ').indexOf(' robustLinks ') < 0 &&  // not a link we created
                (
                    ( hasOriginal || hasMemento || hasDatetime ) 
                ) && 
                RLIsURL(linkHREF)
                );  // test the cleaned uri
    
            if (showLink){
                var popupID = RL_ID();
    
                var robustLinksElement = document.createElement('span');
                robustLinksElement.setAttribute('role',"navigation");
                robustLinksElement.setAttribute('aria-label', 'RLElement');
    
                // Only one menu (the arrow link)
                var outer = document.createElement('ul');
                var dropDownList = document.createElement('li');
                dropDownList.setAttribute('aria-label', 'RLOuter');
                var arrowDown = document.createElement('a');
                arrowDown.href = "";
                arrowDown.setAttribute('aria-haspopup', 'true');
                arrowDown.setAttribute('class', 'robustLinks dropDownButton RLArrow');
                arrowDown.setAttribute('aria-controls', popupID);
    
                // The link glyph
                var linkChar = document.createElement('div');
                linkChar.setAttribute('class','robustLinks dropDownButton RLIcon');
    
                // The dropdown menu
                var dropDownItem = document.createElement('ul');
                dropDownItem.setAttribute('class', 'RLMenu');
                dropDownItem.id = popupID;
                dropDownItem.setAttribute('aria-hidden', 'true');
    
                // Adds the title to the dropdown menu
                var listItem = document.createElement('li');
                listItem.setAttribute('class', 'RLTitle');
    
                // only make the URI-R menu item if there is something to link to
                if (original) {
                    RL_appendHiddenLink(dropDownItem, 'Current version of page', original);
                }
    
                // only make the URI-M menu item if there is something to link to
                if (memento) {
                    RL_appendHiddenLink(dropDownItem, "Version archived on " + RLPrintDate(datetime), memento);
                }
    
                // Adds the Menu Items to the dropdown menu
                if(hasDatetime){
                    var linkDateStr = RLFormatDate(datetime);
                    var link = "http:"+"//timetravel.mementoweb.org/memento/"+linkDateStr+'/'+original;
                    RL_appendHiddenLink(dropDownItem, 'Version archived near '+ RLPrintDate(datetime), link);
                }
    
                RL_appendHiddenLink(dropDownItem, '<span style="text-decoration: underline; color:#0000ff"><img src="https://robustlinks.mementoweb.org/images/robustlinks-16px.png">Robustify Your Links!</span>', 'https://robustlinks.mementoweb.org/')
    
                dropDownList.appendChild(arrowDown);
                dropDownList.appendChild(dropDownItem);
    
                outer.appendChild(dropDownList);
                robustLinksElement.appendChild(outer);
    
                arrowDown.parentNode.insertBefore(linkChar, arrowDown);
    
                // Adds the click function which toggles the aria-hidden Boolean
                arrowDown.onclick = function(e) {
                    var region = document.getElementById(this.getAttribute('aria-controls'));
                    var isClosed = region.getAttribute('aria-hidden') == 'true' ;
                    RLCloseLastOpen();
                        if (isClosed) {
                        region.setAttribute('aria-hidden', 'false');
                        RLLastOpen = region;
                        } else { // region is expanded
                            region.setAttribute('aria-hidden', 'true');
                            RLLastOpen = null;
                    }
                        e.stopPropagation();
    
                    return false;
    
                };
    
                // Insert the robustLinks element directly after the link
                links[i].parentNode.insertBefore(robustLinksElement, links[i].nextSibling);
            }
    
        }
    
        // Clicking anywhere closes the RLLastOpen menu item if it is present.
        document.onclick = RLCloseLastOpen;
    
        return true;
    
    };

    return {

        robustify: function() {
            var RLRestrictedRegexp = new RegExp('(?:'+RLWebArchiveBaseUriToExclude.join(')|(?:')+')');

            if (RLRestrictedRegexp.test(window.location.href)) {
                console.log("Detected web archive, refusing to create Robust Link menus");
            } else { 
                robustify_links_on_page();
            }
        }
    };

})();

// Apply the script at the end of the loading.
document.addEventListener('DOMContentLoaded', function() {
    RobustLinks.robustify();
}, false);
