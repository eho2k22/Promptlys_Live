// 📁 server.js (Express backend)
const express = require("express");
const path = require("path");
require("dotenv").config();


const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// A simple route to check server status
app.get('/ping', (req, res) => {
  res.send('Pong!');
});

// Serve environment variables to the client
app.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_KEY  // It should be the public 'anon' key, not the secret key
  });
});



// Serve static files
app.use(express.static(path.join(__dirname, "public")));


// Serve HTML
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});


// 🔐 Secure API key endpoint
app.get("/api/key", (req, res) => {
res.json({ apiKey: porcess.env.OPENAI_API_KEY });
});


app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});

