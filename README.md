# Robust Links V2 [WIP]

Are you an author of web pages and you don't want your links to die? The `RobustLinksV2` library provides a way to combat "link rot" and "content drift" by augmenting your web links with archival metadata and functionality.

This library helps ensure that even if an original web resource changes or disappears, visitors to your page can still access a preserved version of the content as it was intended at the time of linking. This is achieved by leveraging the [Memento Time Travel](http://timetravel.mementoweb.org/guide/api/) infrastructure, which aggregates web archives from around the world.

![](https://robustlinks.mementoweb.org/demo/robustlinks_demo_light.gif)
*(Note: The GIF shows a previous version's UI, but the core concept of augmented links remains.)*

### See it in Action!

<a href="demo/index.html" style="
    display: inline-block;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    background-color: #007bff;
    border: none;
    border-radius: 5px;
    text-decoration: none;
    text-align: center;
    transition: background-color 0.3s;
">
    Go to the Live Demo
</a>


## Key Concepts

Robust Links enhance standard `<a>` tags with specific `data-*` attributes:

* `data-originalurl`: The original, canonical URI of the resource being linked.
* `data-versiondate`: The intended date of linking to the resource, representing the state the linker wants the visitor to experience.
* `data-versionurl`: (Optional) The URI of one or more pre-existing snapshots of the resource, often from a web archive.

Robust Links annotations are always the **explicit choice of the page author**. The library renders and parses annotations that you provide — it does not automatically generate or guess annotations on your behalf. For a full overview of authoring scenarios, see [https://hvdsomp.info/robustlinks/#examples](https://hvdsomp.info/robustlinks/#examples).

## Installation and Setup

To integrate `RobustLinksV2` into your webpage, include the JS and CSS **by reference** using the persistent links below. Do not download and bundle these files locally — referencing them directly ensures you always use the canonical version, and that any updates (such as a change to the default TimeGate) are picked up automatically.

Add the following lines to your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Robust Links Page</title>

    <!-- RobustLinks CSS -->
    <link rel="stylesheet" type="text/css" href="https://doi.org/10.25776/z58z-r575" />
    <!-- RobustLinks JavaScript -->
    <script type="text/javascript" src="https://doi.org/10.25776/h1fa-7a28"></script>
</head>
<body>
    <!-- Your page content with robust links -->

    <script type="module">
        import { RobustLinksV2 } from 'https://doi.org/10.25776/h1fa-7a28';

        document.addEventListener('DOMContentLoaded', () => {
            const rl = new RobustLinksV2({
                // Your configuration options go here (see below)
            });
        });
    </script>
</body>
</html>
```

## RobustLinksConfig Options

The `RobustLinksV2` class is initialized with a configuration object (`RobustLinksConfig`) to customize its behavior:

```typescript
interface RobustLinksConfig {
    debug?: boolean;           // Enables debug logging to the console. Defaults to false.
    timeGate?: string;         // The base URL for the Memento TimeGate. Defaults to "https://web.archive.org/".
    enableDropdown?: boolean;  // Enables the dropdown menu on robustified links. Defaults to false.
    dropdownArrowColor?: string; // Color of the dropdown arrow. Defaults to "#333".
    dropdownArrowSize?: string;  // Size of the dropdown arrow (e.g. "12px"). Defaults to "12px".
    dropdownArrowHtml?: string;  // Custom HTML for the dropdown arrow. Defaults to "▼".
}
```

## Authoring Robust Links

A robust link is a standard `<a>` tag with `data-originalurl` and `data-versiondate` attributes set by the page author:

```html
<a href="https://web.archive.org/web/20231026/https://example.com"
   data-originalurl="https://example.com"
   data-versiondate="2023-10-26">
    Example
</a>
```

The `data-versionurl` attribute is optional and can list one or more specific snapshots:

```html
<a href="https://web.archive.org/web/20231026143000/https://example.com"
   data-originalurl="https://example.com"
   data-versiondate="2023-10-26"
   data-versionurl="https://web.archive.org/web/20231026143000/https://example.com 2023-10-26">
    Example
</a>
```

For a full range of authoring scenarios see [https://hvdsomp.info/robustlinks/#examples](https://hvdsomp.info/robustlinks/#examples).

## FUTURE WORK
* Server-side fetching for more accurate version dates
* Configurable fallback for versiondate and other parameters

## License
See the [license](http://mementoweb.github.io/SiteStory/license.html).