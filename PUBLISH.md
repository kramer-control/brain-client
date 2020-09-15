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
1. Safety Checks:
  1. `git pull`
  2. `git status`
  3. `npm ci`
  4. `npm test`
2. Prepare the Release:
  1. `npm run build`
  2. `Update the Changelog`
3. Update the Version Number:
  * `npm version [major|minor|patch]`
  * Or manually update version in package.json & package-lock.json
    1. `git commit -am '2.0.0'`
    2. `git tag v2.0.0`
4. Publish to npm:
  `npm publish --access public`
5. Publish to Git:
  `git push && git push --tags && npm run publish:github`
