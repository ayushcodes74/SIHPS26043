const app = require("./app");

const PORT = process.env.PORT || 5000;

console.log("🔥 CivicSync Server loaded successfully");

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});