// robustlinks.js
// @author Yorick Chollet <yorick.chollet@gmail.com>
// @author Harihar Shankar <hariharshankar@gmail.com>
// @author Shawn M. Jones <jones.shawn.m@gmail.com>
// @version 1.6
// License can be obtained at http://mementoweb.github.io/SiteStory/license.html 

// toggle to show the "powered by robust links" footer
// var RLshowFooter = true;

// add urls that should be excluded from robust links.
// accepts full urls or valid regular expression patterns of urls.
var RLuriPatternsToExclude = [
    "https?://dx.doi.org*",
    "https?://doi.org*"
];

// Determining what is a URL. In this case, either a relative path or a HTTP/HTTPS scheme.
var RLhasHTTPRegexp = /^https?:/;
var RLhasColonRegexp = /:/;
function RLIsURL(href) {
    return Boolean(href) && (RLhasHTTPRegexp.test(href) || !RLhasColonRegexp.test(href));
}

// Helper function to provide indexOf for Internet Explorer
// from http://stackoverflow.com/questions/2430000/determine-if-string-is-in-list-in-javascript
if (!Array.prototype.indexOf) {
   Array.prototype.indexOf = function(item) {
      var i = this.length;
      while (i--) {
         if (this[i] === item) return i;
      }
      return -1;
   }
}

// Creates a pseudorandom unique ID
// from https://gist.github.com/gordonbrander/2230317
var RL_ID = function () {
  return 'RL_' + Math.random().toString(36).substr(2, 9);
};

// Appends creates a list-item link to `uri` with `text` and appends it to `parent`
function RL_appendHiddenLink(parent, text, uri) {
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

// Adds leading '0' to numbers
// From http://www.w3schools.com/jsref/jsref_gethours.asp
function RLAddZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

// Formats the dateStr in the aggregator format YYYYMMDDHHmmSS
function RLFormatDate(dateStr) {
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
function RLPrintDate(dateStr){
    var formatted = RLFormatDate(dateStr);
    var date = formatted.substr(0, 4) + '-' + formatted.substr(4, 2)+ '-' + formatted.substr(6, 2);

    if (formatted.substr(8, 6) != '000000'){
        date += ' '+formatted.substr(8, 2) + ':' + formatted.substr(10, 2)+ ':' + formatted.substr(12, 2);
    }
    return date;
}

// Extracts the domain name from an archive url.
var RLDomainRegExp = new RegExp('(?:https?://)?(?:www\\.)?((?:[A-Za-z0-9_\\.])+)(?:/.*)?','i');
function RLPrintDomainName(url) {
    var match = url.match(RLDomainRegExp);
    if (match){
        if (match.length > 1) {
            var domain_name =  match[1];
            var max_length = 15;
            if (domain_name.length > max_length){
                return domain_name.substr(0, max_length) + '...';
            }
            return domain_name;
        }
    }
    return 'unknown archive';
}

// Keeps track of the last open menu to close it.
var RLLastOpen;
function RLCloseLastOpen(){
    if(RLLastOpen){
        RLLastOpen.setAttribute('aria-hidden', 'true');
        RLLastOpen = null;
    }
}

// Extracts information 
function RLGetAttribute(obj, str){
    try{
        return obj.getAttribute(str).trim();
    } catch(err) {
        return "";
    }
}

function robustify_links_on_page() {

    console.log("callable robust links started...");

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
    
    for(var i=0; i<links.length; i++) {

        // Extracts link information
        var linkHREF =  RLGetAttribute(links[i], 'href');
        
        if (!linkHREF.search("http") == 0) {
            var loc = window.location;
            var abLink = loc.protocol + "//" + loc.host;

            if (!linkHREF.search("/|../|./") == 0) {
                abLink += "/";
            }

            linkHREF = abLink + linkHREF;
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

        // Menu appearance conditions
        // Constructs the regular expression of restricted URIs from the baseRestrictedURI and the ones given in parameters
        var RLRestrictedRegexp = new RegExp('(?:'+RLuriPatternsToExclude.join(')|(?:')+')');

        var showLink  = (
            links[i].href.length > 0 &&  // no inner/empty links
            (' ' + links[i].className+' ').indexOf(' robustLinks ') < 0 &&  // not a link we created
            (
                ( hasOriginal || hasMemento || hasDatetime ) && // one menu item at least
                ! RLRestrictedRegexp.test(linkHREF)
            ) && // .href can be rewritten. but so is the regexp 
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
            // listItem.innerHTML = 'Robust Links';
            // dropDownItem.appendChild(listItem);

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
}

// Apply the script at the end of the loading.
document.addEventListener('DOMContentLoaded', function() {
    robustify_links_on_page();
}, false);
