### Install new dependencies + Avoid rebuilding docker
docker compose exec <frontend/backend> npm install <packages> -D --prefix <frontend/backend>

### Clean Wipe and Reinstall
`docker compose down` 
Make sure containers are down

`rm -rf frontend/node_modules frontend/package-lock.json backend/node_modules backend/package-lock.json node_modules package-lock.json`
Remove all previously installed modules and package-lock

`npm install --prefix frontend` AND `npm install --prefix backend`
Reinstall node modules for frontend and backend

`npm install`
Reinstall node modules for root

`docker compose up -d --build`
Rebuild docker and run start up containers