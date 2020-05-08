# Robust Links
Are you an author of web pages and you don't want your links to die? Here is a really easy way to achieve just that:

* Include the robustlinks JavaScript and CSS files into your pages as shown below.
* Link robustness can be achieved by decorating the links as explained in the [Link Decoration document](http://robustlinks.mementoweb.org/spec/).
* You can read about the motivations for using robust links [here](http://robustlinks.mementoweb.org/about/). 
* The result will be that each link will be augmented with the ability to see the linked resource as it was around creation time of the page. This is achieved by resolving links using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) infrastructure that aggregates web archives, worldwide. At any time, even when a link breaks, the Robust Link will lead to archived content.

![](http://robustlinks.mementoweb.org/demo/robustlinks_demo.gif)

## Add Robust Links To Your Webpages

Simply append the following lines to the `<head>` of your HTML source:

```html
<!-- RobustLinks CSS -->
<link rel="stylesheet" type="text/css" href="http://robustlinks.mementoweb.org/tools/js/robustlinks.css" />
<!-- RobustLinks Javascript -->
<script type="text/javascript" src="http://robustlinks.mementoweb.org/tools/js/robustlinks-min.js"></script>
<script type="text/javascript" src="http://robustlinks.mementoweb.org/tools/js/robustlinks-uri-exclude-list.js"></script>
```

## RobustLinks Menu

After adding the RobustLinks javascript source to your HTML file, a new link icon will appear next to all the decorated links in the page. Clicking the down arrow in this link icon will pop up a menu with one or more of the following items, depending on the decoration attributes provided in each of the links.

* `Memento near ...`: When clicking this menu item, the javascript library will use the datetime provided in the `data-versiondate` attribute along with the original url and redirect you to the closest memento around that datetime using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) service.

* `Memento from Robust Link`: Clicking this menu item will redirect you to the memento url provided in the `data-versionurl` attribute.

* `Live web version`: Clicking this menu item will take you to the original url provided in the `data-originalurl` attribute.

### Exclude URLs from Robust Links

You can exclude certain URLs in your webpage from showing the robust links drop down menu by adding them to the `robustlinks-uri-exclude-list.js` file. Typically, URLs in a webpage that point to other pages in your site, or URLs to any redirection services can be included in this exclusion list. 

To exclude URLs, simply download a copy of the [`robustlinks-uri-exclude-list.js`](https://raw.githubusercontent.com/mementoweb/robustlinks/master/robustlinks-uri-exclude-list.js) file, edit this to include the URLs that need to be excluded, and replace the URL of the `robustlinks-uri-exclude-list.js` file in the HTML source with the new HTTP URL of the local file. 

The exclusion file contains a [list](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) of either full HTTP URLs to be excluded, or URL patterns constructed as [Javascript Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). Simply put the URL patterns within quotes separated by commas, except for the last URI pattern. A sample exclusion list looks like:

```javascript
var RLuriPatternsToExclude = [
    "https?://dx.doi.org*",
    "https?://purl.org*",
    "https?://identifiers.org*",
    "https?://handle.net*",
    "https?://n2t.net*"
];
```

## Example
- [Before](http://robustlinks.mementoweb.org/demo/uri_references.html)
- [After](http://robustlinks.mementoweb.org/demo/uri_references_js.html) 

## License
See the [license](http://mementoweb.github.io/SiteStory/license.html).

