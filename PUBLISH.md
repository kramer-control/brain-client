# Publishing Documentation

## Add the Git Remote
```
git remote add --mirror=fetch github  git@kramer-control_brain-client.github.com:kramer-control/brain-client.git
```

## Update your SSH Config
Add to your `~/.ssh/config`:

```
# @kramer/brain-client GitHub
Host kramer-control_brain-client.github.com
  Hostname github.com
  IdentityFile ~/.ssh/id_kramer-brainclient-github
```

## Get the GitHub Key

Get the `id_kramer-brainclient-github` key file from Kramer Control Devops and put in `~/.ssh/id_kramer-brainclient-github` 

## Push from your BitBucket Repo to GitHub

Every time you want to sync to GitHub, do:
```
git push github --all
```

## TODO: NPM
TODO: Document NPM Publish process