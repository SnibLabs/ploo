// Utility functions for Space Shooter

function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
function rectsCollide(a, b) {
    return (
        a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y
    );
}