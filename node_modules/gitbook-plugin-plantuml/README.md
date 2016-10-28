**GitBook PlantUml Plugin**
==============

This is a sample plugin for GitBook and is specially adapted for GitBook from [PlantUML](http://www.plantuml.com/index.html). Gitbook PlantUml plugin is used to select from markdown uml and converting it into a picture format svg.

**Example:**

*Text format uml:*

<pre><code>```uml
@startuml

	Class Stage
	Class Timeout {
		+constructor:function(cfg)
		+timeout:function(ctx)
		+overdue:function(ctx)
		+stage: Stage
	}
 	Stage &lt;|-- Timeout

@enduml
```
</code></pre>

![](./images/uml.png)

***Image uml.***

**How to use it:**
--------------

Gitbook PlantUml plugin can be installed from NPM using:

```$ npm install gitbook-plugin-plantuml```

Configure plugin in `book.json`.

```
{
    "plugins": ["plantuml"]
}
```

This plugin only works in your local machine. You need to play with local `gitbook` (command-line tool) to pre-compile all uml images.

```$ gitbook serve yourbook```

or 

```$ gitbook build yourbook```

***Additional requirements:***

 - Create a directory */assets/images/uml* in the root of your project.
 - [Install PlantUML.](http://www.plantuml.com/download.html) (Download plantuml.jar to root path)

For Mac OS X users. Install *graphviz* package.

```$ brew install graphviz```
