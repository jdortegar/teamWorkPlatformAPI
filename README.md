# hablaapi
# Habla Application Services
            
## Habla API Structure
There are no standard structures for API layout in NodeJS/Express, but there are some best practices to implementing APIs.  The best practice for Habla API structure dictates a modular appraoch to the API design.

### root directory
This is the directory for the api.  It contains the README.md (this file), `package.json`, which is the configuration file for NodeJS and is used by `npm install` to install necessary packages required by the application.  It also contains the `src` directory, where all application source code lives.

### ./src directory
The `src` directory contains all source code, including the `index.js` file at the root level, which is the container for the NodeJS application.  This file uses `require` statements to pull-in all of the other code distributed among the following subdirectories:

### ./src/config
Pretty much just what it sounds like - this directory contains all environment / system configuration logic

###./src/routes
This folder contains all service routes (URIs) for the API.  Each .js file in this directory `requires` the necessary controller in the `../controllers` directory.

### ./src/controllers
This directory contains all logic to support a particular service route, invoked from the `../routes` path.

### ./src/helpers
This directory contains all common utility functions to support the API

### ./src/models
This directory contains the functions to interact with the database / datastore for an entity; usually invoked via controllers.

### ./src/policies
This is where service policy-related functions (e.g., role-based access logic) is stored

To run the service, set your working directory to `hablaapi` and run
```
$ npm start
```
If you get an error that there are missing modules, run
```
$ npm install
```
This should install all necessary modules into the `hablaapi/node_modules` directory.  **NEVER** add the `node_modules` folder to your git repo; this will break the service on other platforms (e.g., **PRODUCTION**).


##Habla Git Workflow
If you are not familiar with git, **PLEASE** read up on the subject before proceeding.  A good reference is *Professional Git* by Brent Laster.

To setup your local repository:
Once you have installed git, create a local folder called habla-dev.  This will be the root for all of your git repos for Habla work.
From this folder, then use the command:

```
$ git clone https://gituser:password@github.com/Habla-Inc/hablaapi.git hablaapi
Cloning into 'hablaapi'...
remote: Counting objects: 20, done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 20 (delta 0), reused 0 (delta 0), pack-reused 17
Unpacking objects: 100% (20/20), done.
```
This creates a folder under habla-dev called *hablaapi* that contains a clone of the origin repository.  In git parlance, the origin repository is the one hosted in GitHub, and the remote repository is the one on your local machine.  At this moment, the remote repo on your machine is in synch with the origin.

To see the status of the repository on your machine:
```
$ git status
On branch development
Your branch is up-to-date with 'origin/development'.
nothing to commit, working tree clean
```
To see the history of the repo that you just cloned:
```
$ git log --oneline --decorate --graph --all
* 818be50 (HEAD -> development, origin/development, origin/HEAD) Cleaning up setup work
*   63587cb Merge branch 'development' of https://github.com/Habla-Inc/hablaapi into development
|\  
| * 9edbb6d Update README.md
| * 83694fd Update README.md
| * bc62bbe (origin/master) Update README.md
* |   2d6dcc0 Merge branch 'feat-123' into development
|\ \  
| |/  
|/|   
| * 52c3959 added test2 file
| * 0bf9592 added test file
|/  
* 4a3d5b6 Initial commit
```
When you are ready to begin work on a specific feature, create a new branch.  The branch should be named according to the story or bug ID related to your work.  It is always safest to re-pull the code from github to make sure that you are working on the latest checkin.  This reduces the effort to merge your work back into the codebase and reduces the likelihood of clobbering in-flight work of others. For example, if you are working on a feature with the story tag _FEAT-123_, you type:
```
$ git checkout -b feat-123 development
Switched to a new branch 'feat-123'
```
and this creates a local branch _feat-123_ for your feature work, if it doesn't already exist.  As you do development work, you use the following commands (among others) to maintain your local repo:
```
git status
git add
git commit
git log --oneline --decorate --graph --all
```
As you make changes and additions to your project, it is wise to commit them to your local repository.  As a general rule, commits to your local repo should be made each time you complete a discrete piece of functionality and the code compiles.  You should avoid adding code that breaks the build to the repository.  To determine which files to add to your commit:
```
$ git status
On branch feat-123
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   README.md

no changes added to commit (use "git add" and/or "git commit -a")
```
We see that _README.md_ has been modified and not yet added to the commit.  To add it:
```
$ git add README.md
$ git status
On branch feat-123
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	modified:   README.md

```
So the file is staged and ready to be committed.  To commit the change:
```
$ git commit -m "Added additional verbosity to the README.md file."
[feat-123 3dfe877] Added additional verbosity to the README.md file.
 1 file changed, 33 insertions(+), 6 deletions(-)
```
Once you have added files and committed changes to your local branch, you must create this branch in the origin repository.  This is done by :
```
$ git push --set-upstream origin feat-123
Counting objects: 3, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 908 bytes | 0 bytes/s, done.
Total 3 (delta 1), reused 0 (delta 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local objects.
To https://github.com/Habla-Inc/hablaapi.git
 * [new branch]      feat-123 -> feat-123
Branch feat-123 set up to track remote branch feat-123 from origin.
```
You should regularly push your local branch to the repository to prevent accidental loss of work.  This is done by:

Once your feature work is complete, please contact the scrum master to coordinate merge into the main development branch.

To merge your feature branch into the development branch:
```
$ git checkout development
Switched to branch 'development'
Your branch is up-to-date with 'origin/development'.
$ git merge --no-ff feat-123
Merge made by the 'recursive' strategy.
 README.md | 86 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
 1 file changed, 75 insertions(+), 11 deletions(-)
```
You no longer need the _feat-123_ branch since this work has been completed, so delete the branch by:
```
$ git branch -d feat-123
Deleted branch feat-123 (was e150c2b).
```
Now push your changes up to the origin:
```
$ git push
Counting objects: 1, done.
Writing objects: 100% (1/1), 251 bytes | 0 bytes/s, done.
Total 1 (delta 0), reused 0 (delta 0)
To https://github.com/Habla-Inc/hablaapi.git
   818be50..0409625  development -> development
```



## Dependencies

* [Node.js](https://nodejs.org/) version >6.x

* [DynamoDB](http://docs.aws.amazon.com/amazondynamodb/latest/gettingstartedguide/GettingStarted.Download.html)

* [Redis](https://redis.io/download) version >=3.2


## Install

    npm install


## Commands

* `npm run start` - starts the development server with hot reloading enabled

* `npm run test` - start the test runner

* `npm run watch:test` - start the test runner with watch mode

* `npm run build` - build for production into `dist` directory.

* `npm run start:prod` - run for production (assumes built)

Refer to the scripts section of `package.json` for a complete and more accurate listing of available commands.


## Usage
Navigate to [http://localhost:3000/](http://localhost:3000/) for the UI.

NOTE: No UI for this!!! This serves REST endpoints...!!!  ONLY!!! Go to the webapp for that.


## Commit

lint and test tasks are run, and need to be passed, before checkin.
Although not preferable, you can bypass the commit hook to checkin your code.
Since tests are run in CI, you must at least pass the tests.
Either that, or don't write tests...


## Documentation

To generate html from inline documentation and templates (including RAML API documentation):

    npm run doc
    open doc/code/index.html
    open doc/api.html

Generic documentation is generated, and includes your added [esdoc](https://esdoc.org)-style comments.
Don't go crazy, but try to document things that you think might be unclear to someone looking at your code.
I'm sure you don't want to have to explain it over and over again verbally.
API documentation is also generated.

Additional documentation can be referenced in [Confluence](https://hablaai.atlassian.net/wiki/display/PD/Habla+API+Server).


## Deployment

### CI Build

    npm install
    npm build

Distribution assets to push:  TODO: probably archive it too.

### Target

#### Environment Variables

    WEBAPP_BASE_URI points to the webapp (ex. https://habla.ai)

Please refer to src/config/env/index.js for a more complete and up-to-latest listing of environment variables available.

#### Runtime

    npm run start:prod
    
That's one way.
TODO: Another way is ...


### Client

You can use a command line client to invoke the REST APIs, play around with usage, and listen to events.

    npm run client:dev
    npm run client:local
    npm run client:ngrok

