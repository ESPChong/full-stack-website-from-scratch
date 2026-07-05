const app = require('./app');
const cors = require('cors');
const connectMongoDB = require('./config/db');
const { connectRedis } = require('./config/redis');

app.use(cors());

// Initialize Database and Redis Connections
connectMongoDB();
connectRedis();


// Start the server
const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port ${port}`));