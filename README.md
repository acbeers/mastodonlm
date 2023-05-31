# List manager for Mastodon

A simple list manager, bulit in the style of Twitter List Manager.

This is running live [HERE](https://www.mastodonlistmanager.org).

## Development Setup

To get ready for development, ensure all packages are installed:

```
pipenv install
npm i
cd list-manager
npm i
```

Also ensure Node installed. I have developed this with Node 19.7

If you make changes in `packages/shared`, which contains shared Typescript
libraries, you'll have to run `yarn run build:packages` for the other workspaces
to see interface changes.

## Running locally

To run locally, you'll first have to do a deploy of the backend to create the
DynamoDB tables for tracking authentication. Using an account that has enough
permissions (Serverless recommends an account with full admin access):

```
AWS_PROFILE=<account> sls deploy
```

Then you can run things locally:

```
AWS_PROFILE=<account> sls offline
```

Run the front end via yarn

```
yarn start
```

To use, go to `http://localhost:3000/main`, which will allow you to enter your
server name to start the login process.

## Architectural notes

The app is mostly a Single Page Application, with all of the traffic to and from
the Mastodon server being handled by a Web Worker (via the very fine
[Comlink](https://github.com/GoogleChromeLabs/comlink) library) to keep secrets
from prying eyes.

Authentication still happens mostly via a backend process, deployed to AWS
Lambda, written in Python. This allows me to minimize the "applications" that
are registered on a given Mastodon server, and protect the client IDs and
secrets associated with those applications. After authentication happens, the
token is disclosed to the client and further API calls are made directly by the
Javascript app. The token is discarded when the page is closed (it is not
persisted to local storage or stored as a cookie).

The core work of the List Manager (list creation, account adds and deletes,
etc.) are implemented in Typescript and run directly in the browser. They can
also run via published Lambda functions via the server (though there is no
user-friendly way yet to switch between these modes)

The app reqeusts hopefully a minimal set of scopes from Mastodon: `read:lists`,
`read:follows`, `read:accounts`, `write:lists`, `write:follows` to minimize the
things it can change about the account.

There are three configured stages for AWS:

- `dev`, which mostly contains the DynamoDB tables and lambda functions

- `devstage`, which contains everything, including the web app and its hosted
  domain.

- `newprod`, which contains everything, including the web app and its hosted
  public-facing domain (https://www.mastodonlistmanager.org)
