// utils/questGenerator.js

const Quest = require("../models/quests"); // Adjust the path as necessary

const generateInGameQuests = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const expiresAt = new Date(today);
  expiresAt.setDate(expiresAt.getDate() + 1); // Expires tomorrow

  // Define the number of quests per type
  const questTypes = {
    "tap-based": 5,
    "points-based": 5,
    "social": 5
  };

  // Sample quests data
  const sampleQuests = {
    "tap-based": [
      {
        title: "Daily Tapping Frenzy",
        description: "Perform 100 taps today to earn rewards!",
        reward: 50,
        nature: "tap-based",
        target: 100,
        imageURL: "https://example.com/images/tapping_frenzy.png"
      },
      {
        title: "Master Tapper",
        description: "Achieve 200 taps today and level up!",
        reward: 75,
        nature: "tap-based",
        target: 200,
        imageURL: "https://example.com/images/master_tapper.png"
      },
      {
        title: "Super Tapper",
        description: "Complete 500 taps today to become a legend!",
        reward: 150,
        nature: "tap-based",
        target: 500,
        imageURL: "https://example.com/images/super_tapper.png"
      },
      {
        title: "Tap Champion",
        description: "Achieve 50 taps today to earn a badge!",
        reward: 30,
        nature: "tap-based",
        target: 50,
        imageURL: "https://example.com/images/tap_champion.png"
      },
      {
        title: "Tap Legend",
        description: "Complete 800 taps today and become a legend!",
        reward: 200,
        nature: "tap-based",
        target: 800,
        imageURL: "https://example.com/images/tap_legend.png"
      }
    ],
    "points-based": [
      {
        title: "Point Collector",
        description: "Earn 500 points today by completing tasks.",
        reward: 100,
        nature: "points-based",
        target: 500,
        imageURL: "https://example.com/images/point_collector.png"
      },
      {
        title: "Points Marathon",
        description: "Accumulate 1000 points by completing various missions.",
        reward: 200,
        nature: "points-based",
        target: 1000,
        imageURL: "https://example.com/images/points_marathon.png"
      },
      {
        title: "Points Guru",
        description: "Reach 1500 points today and unlock special bonuses.",
        reward: 250,
        nature: "points-based",
        target: 1500,
        imageURL: "https://example.com/images/points_guru.png"
      },
      {
        title: "Points Master",
        description: "Earn 2000 points today to master the game!",
        reward: 300,
        nature: "points-based",
        target: 2000,
        imageURL: "https://example.com/images/points_master.png"
      },
      {
        title: "Points Overlord",
        description: "Accumulate 2500 points today to reign supreme.",
        reward: 400,
        nature: "points-based",
        target: 2500,
        imageURL: "https://example.com/images/points_overlord.png"
      }
    ],
    "social": [
      {
        title: "Social Sharer",
        description: "Share our game on Facebook to earn rewards!",
        reward: 150,
        nature: "social",
        target: null, // Not applicable for social quests
        imageURL: "https://example.com/images/social_sharer.png"
      },
      {
        title: "Twitter Promoter",
        description: "Tweet about our game to earn exclusive rewards!",
        reward: 120,
        nature: "social",
        target: null,
        imageURL: "https://example.com/images/twitter_promoter.png"
      },
      {
        title: "Instagram Influencer",
        description: "Post about our game on Instagram to gain rewards.",
        reward: 130,
        nature: "social",
        target: null,
        imageURL: "https://example.com/images/instagram_influencer.png"
      },
      {
        title: "LinkedIn Connector",
        description: "Connect with our page on LinkedIn to earn rewards.",
        reward: 140,
        nature: "social",
        target: null,
        imageURL: "https://example.com/images/linkedin_connector.png"
      },
      {
        title: "YouTube Promoter",
        description: "Share a video about our game on YouTube to earn rewards.",
        reward: 160,
        nature: "social",
        target: null,
        imageURL: "https://example.com/images/youtube_promoter.png"
      }
    ]
  };

  const questsToInsert = [];

  // Iterate over each quest type and select the required number of quests
  for (const [nature, count] of Object.entries(questTypes)) {
    const quests = sampleQuests[nature];
    if (quests && quests.length >= count) {
      questsToInsert.push(...quests.slice(0, count).map(quest => ({
        ...quest,
        generationDate: today,
        expiresAt: expiresAt
      })));
    } else {
      console.warn(`Not enough quests for nature: ${nature}. Needed: ${count}, Found: ${quests ? quests.length : 0}`);
    }
  }

  try {
    await Quest.insertMany(questsToInsert);
    console.log("Quests generated successfully.");
    questsToInsert.forEach((quest, index) => {
      console.log(`${index + 1}. [${quest.nature}] ${quest.title}`);
    });
  } catch (error) {
    console.error("Error generating quests:", error);
  }
};

module.exports = generateInGameQuests;