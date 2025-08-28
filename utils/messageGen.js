/**
 * Creates a personalized message for a user
 * @param {string} userId - The Discord user ID
 * @param {string} baseMessage - The base ad message from ad.txt
 * @returns {string} Personalized message
 */
function createRandomPersonalizedMessage(userId, baseMessage) {
  // You can customize this function to add personalization
  // For now, it just returns the base message with optional user mention
  
  // Optional: Add some randomization or personalization here
  const greetings = [
    "Hey there!",
    "Hi!",
    "Hello!",
    "Greetings!",
    "What's up!"
  ];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  // You can uncomment the line below if you want to add a greeting
  // return `${randomGreeting}\n\n${baseMessage}`;
  
  // For now, just return the base message
  return baseMessage;
}

module.exports = { createRandomPersonalizedMessage };