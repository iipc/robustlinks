# Robust Links
Are you an author of web pages and you don't want your links to die? Here is a really easy way to achieve just that:

* Express the creation date of your pages in a machine-actionable manner, using the [schema.org](https://schema.org/) approach.
  * Robust Links currently supports `datePublished` and `dateModified` attributes.
* Include the robustlinks JavaScript and CSS files into your pages as shown below.
* The result will be that each link will be augmented with the ability to see the linked resource as it was around creation time of the page. This is achieved by resolving links using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) infrastructure that aggregates web archives, worldwide. At any time, even when a link breaks, the Robust Link will lead to archived content.
* Even better link robustness can be achieved by decorating the links as explained in the [Link Decoration document](http://robustlinks.mementoweb.org/spec/).
* You can read about the motivations for using robust links [here](http://robustlinks.mementoweb.org/about/). 

![](http://robustlinks.mementoweb.org/demo/robustlinks_demo.gif)

## Add Robust Links To Your Webpages

Simply append the following lines to the `<head>` of your HTML source:

```html
<!-- RobustLinks CSS -->
<link rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/mementoweb/robustlinks/master/robustlinks.css" />
<!-- RobustLinks Javascript -->
<script type="text/javascript" src="https://cdn.rawgit.com/mementoweb/robustlinks/master/robustlinks-min.js"></script>
<script type="text/javascript" src="https://cdn.rawgit.com/mementoweb/robustlinks/master/robustlinks-uri-exclude-list.js"></script>
```

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

