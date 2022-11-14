# List manager for Mastodon

A simple list manager, bulit in the style of Twitter List Manager.

## Development Setup

To get ready for development, ensure all packages are installed:

```
pipenv install
npm i
cd list-manager
npm i
```

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

Run the front end via npm

```
cd list-manager
npm run start
```

To use, go to `http://localhost:3000/login`, which will redirect you to
`hachyderm.io` to authorize your account (support for other servers coming
soon).

## Architectural notes

Right now, this is a pretty simple app, but some things to know:

- The app reqeusts hopefully a minimal set of scopes from Mastodon:
  `read:lists`, `read:follows`, `read:accounts`, `write:lists`

- The app stores oAuth tokens in a DynamoDB table for one day. This token is
  never disclosed to the client, only a randomly generated cookie is.

- The backend retains no state except for the auth token.

- Right now, it always gets your full list of follows and presents them in an
  alphabetized list, so it probably isn't yet good for accounts following a
  large number of accounts. Eventually, I'll make the list hierarchical like
  Twitter List Manager does.
