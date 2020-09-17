# Publishing Documentation

This is publishing documentation for Kramer developers, won't work for anyone else, sorry!

## Add the Git Remote
```
git remote add --mirror=fetch github  git@kramer-control_brain-client.github.com:kramer-control/brain-client.git
```

## Update your SSH Config
Add to your `~/.ssh/config`:

```
# @kramerav/brain-client GitHub
Host kramer-control_brain-client.github.com
  Hostname github.com
  IdentityFile ~/.ssh/id_kramer-brainclient-github
```

## Get the GitHub Key

Get the `id_kramer-brainclient-github` key file from Kramer Control Devops (AWS Secrets Vault) and put in `~/.ssh/id_kramer-brainclient-github` 

## Push from your BitBucket Repo to GitHub

Every time you want to sync to GitHub, do:
```
npm run publish:github
```

## Publish to NPM

*Prereq:*
You must be logged into an NPM account that is part of the `@kramerav` NPM org. Logging into NPM is out of scope of this doc, Google is your friend.

1. Safety Checks:
    * `git pull`
    * `git status`
    * `npm ci`
    * `npm test`
2. Prepare the Release:
    * `npm run build`
    * Update `CHANGELOG.md`
3. Update the Version Number:
    * `npm version [major|minor|patch]`
    * Or manually update version in package.json & package-lock.json, then `git commit -am '2.0.0'` and `git tag -a v2.0.0 -m "Version 2.0.0" <hash>`
4. Publish to npm: `npm publish --access public`
5. Publish to Git: `git push && git push --tags && npm run publish:github`

Good reference: https://cloudfour.com/thinks/how-to-publish-an-updated-version-of-an-npm-package/
