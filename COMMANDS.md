### Install new dependencies in target folder
npm install <package> -w <frontend/backend>

### Install new dev dependencies in target folder
npm install <package> -D -w <frontend/backend>

### Run a script in target workspace
npm test -w <frontend/backend>
npm run build -w <frontend/backend>

### Rebuild Docker Container
docker compose build --no-cache <service>

### Clean Wipe and Reinstall
`docker compose down` 
Make sure containers are down

`rm -rf node_modules package-lock.json`
Remove previously installed modules and package-lock

`npm install`
Reinstall node modules

`docker compose up -d --build`
Rebuild docker and run start up containers