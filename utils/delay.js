/**
 * Creates a delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise} Promise that resolves after the delay
 */
function delay(min, max) {
  const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Waiting ${randomDelay}ms...`);
  return new Promise(resolve => setTimeout(resolve, randomDelay));
}

module.exports = { delay };