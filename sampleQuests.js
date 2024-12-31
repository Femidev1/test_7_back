// sampleQuests.js

const sampleQuests = [
    // In-Game Tap-Based Quests
    {
      title: "Tap Champion",
      description: "Tap the 'Attack' button 100 times to defeat your enemies and earn your reward!",
      type: "in-game",
      nature: "tap-based",
      target: 100, // Whole number
      reward: 25,
      imageURL: "https://via.placeholder.com/150?text=Tap+Champion",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: true,
    },
    {
      title: "Speed Tapper",
      description: "Tap the 'Jump' button 150 times within 5 minutes to complete this quest!",
      type: "in-game",
      nature: "tap-based",
      target: 150, // Whole number
      reward: 30,
      imageURL: "https://via.placeholder.com/150?text=Speed+Tapper",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: true,
    },
  
    // In-Game Points-Based Quests
    {
      title: "Points Collector",
      description: "Accumulate 500 points in any game mode to unlock your reward!",
      type: "in-game",
      nature: "points-based",
      target: 500, // Whole number
      reward: 50,
      imageURL: "https://via.placeholder.com/150?text=Points+Collector",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: true,
    },
    {
      title: "High Score Hero",
      description: "Achieve a high score of 1000 points in the 'Arcade Mode' to claim your reward!",
      type: "in-game",
      nature: "points-based",
      target: 1000, // Whole number
      reward: 75,
      imageURL: "https://via.placeholder.com/150?text=High+Score+Hero",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: true,
    },
  
    // External Quests
    {
      title: "Follow Us on Twitter",
      description: "Follow our official Twitter account to stay updated and earn rewards!",
      type: "external",
      nature: "social",
      target: 1, // Whole number
      reward: 20,
      imageURL: "https://via.placeholder.com/150?text=Follow+Twitter",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: false,
    },
    {
      title: "Watch Our YouTube Video",
      description: "Watch our latest YouTube video and confirm to receive your reward!",
      type: "external",
      nature: "social",
      target: 1, // Whole number
      reward: 25,
      imageURL: "https://via.placeholder.com/150?text=Watch+YouTube",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: false,
    },
    {
      title: "Join Our Discord Server",
      description: "Join our Discord community to connect with other players and earn rewards!",
      type: "external",
      nature: "social",
      target: 1, // Whole number
      reward: 30,
      imageURL: "https://via.placeholder.com/150?text=Join+Discord",
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
      isClaimed: false,
      generationDate: new Date().setHours(0, 0, 0, 0),
      countsAsQuestCompletion: false,
    },
  ];
  
  module.exports = sampleQuests;