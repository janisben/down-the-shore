/*
  DOWN THE SHORE — EASY EDIT FILE
*/

window.SITE_DATA = {
  supabase: {
    url: "https://iizdyvetzdhpsgrcflbm.supabase.co",
    publishableKey: "sb_publishable_SgcSAnIPUDHhNn5BLDV_Ng_Eqz5Mk85"
  },

  brand: {
    name: "Down the Shore",
    domain: "downtheshore.me",
    eyebrow: "Ocean City, New Jersey",
    headline: "Charming homes for slowing down, getting comfortable, and making memories.",
    intro: "A small collection of thoughtfully hosted shore homes for relaxed stays and memorable time together.",
    contactEmail: ""
  },

  owners: {
    janis: {
      name: "Janis",
      email: "",
      phone: ""
    }
  },

  properties: [
    {
      id: "big-yellow-house",
      databaseName: "Big Yellow House",
      name: "Big Yellow House",
      owner: "janis",
      location: "Ocean City, New Jersey",
      tagline: "Porch mornings, room to gather, and the easy rhythm of shore life.",
      bedrooms: 3,
      bathrooms: 1,
      sleeps: 8,
      dogFriendly: true,
      image: "assets/garden-night.jpeg",
      imagePosition: "center",
      status: "Available for direct booking",
      summary: "A charming historic home with comfortable gathering spaces, a welcoming porch, and room to settle in.",
      description: "The Big Yellow House is a thoughtfully cared-for Ocean City home with historic character, a front porch, and comfortable spaces for a relaxed shore stay.",
      amenities: [
        "Front porch",
        "Private outdoor space",
        "Full kitchen",
        "Wi-Fi",
        "Air conditioning",
        "Dog friendly — maximum two dogs"
      ],
      ratesNote: "Rates vary by week. Dogs are welcome for $75 per dog, with a maximum of two. No smoking or vaping is permitted anywhere on the property."
    },
    {
      id: "little-yellow-cottage",
      databaseName: "Little Yellow Cottage",
      name: "Little Yellow Cottage",
      owner: "janis",
      location: "Ocean City, New Jersey",
      tagline: "A tucked-away little retreat with charm in every corner.",
      bedrooms: 1,
      bathrooms: 1,
      sleeps: 2,
      dogFriendly: true,
      image: "assets/hanging-chair.jpeg",
      imagePosition: "center",
      status: "Available for direct booking",
      summary: "A cozy one-bedroom hideaway designed for quiet mornings, relaxed evenings, and a slower pace.",
      description: "The Little Yellow Cottage is a private one-bedroom apartment with its own entrance and outdoor nook, thoughtfully prepared for an easy Ocean City stay.",
      amenities: [
        "Private entrance",
        "Hanging-chair nook",
        "Kitchen",
        "Wi-Fi",
        "Air conditioning",
        "Free street parking",
        "Dog friendly — maximum two dogs"
      ],
      ratesNote: "Check-in is 2:00 PM and checkout is 10:00 AM. Cleaning fee is $125. Dogs are $75 each, maximum two. We maintain a clean, fresh, smoke-free property; smoking and vaping are not permitted anywhere on the premises."
    }
  ]
};
