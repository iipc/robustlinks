# Robust Links
Are you an author of web pages and you don't want your links to die? Here is a really easy way to achieve just that:

* Include the Robust Links JavaScript and CSS files into your pages as shown below.
* Robustify your links by adding HTML elements as explained in the [Robustifying Links document](http://robustlinks.mementoweb.org/spec/).
* You can read about the motivations for using Robust Links [here](http://robustlinks.mementoweb.org/about/). 
* The result will be that each link is augmented with the ability to see the linked resource as it was at or around the time the link was created. This is achieved by resolving links using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) infrastructure that aggregates web archives from around the world. At any time, even when a link breaks, the Robust Link will lead to archived content.

![](https://mementoweb.org/static/css/images/robustlinks.png)

## Add Robust Links To Your Webpages

Simply append the following lines to the `<head>` section of your HTML source:

```html
<!-- RobustLinks CSS -->
<link rel="stylesheet" type="text/css" href="http://mementoweb.github.io/robustlinks/robustlinks.css" />
<!-- RobustLinks Javascript -->
<script type="text/javascript" src="http://mementoweb.github.io/robustlinks/robustlinks-min.js"></script>
```

## RobustLinks Menu

After adding the Robust Links JavaScript source to your HTML file, a new link icon will appear next to all the robustified links in the page. Clicking the down arrow in this icon will pop up a menu with the following items:

* `Current version of page`: Clicking this menu item will take you to the original url provided in the `data-originalurl` attribute.

* `Version archived on <date>`: Clicking this menu item will redirect you to the memento url provided in the `data-versionurl` attribute.

* `Version archived near <date>`: When clicking this menu item, the JavaScript library will use the datetime provided in the `data-versiondate` attribute along with the original url and redirect you to the closest memento around that datetime using the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) service.


## Example
- [Before](http://robustlinks.mementoweb.org/demo/uri_references.html)
- [After](http://robustlinks.mementoweb.org/demo/uri_references_js.html) 

## License
See the [license](http://mementoweb.github.io/SiteStory/license.html).

