const fs = require('fs').promises;
const path = require('path');

class CoffeeDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  // Gets the default coffee menu items
  getDefaultData() {
    return [
      {
        id: "espresso",
        name: "Midnight Velvet Espresso",
        category: "Espresso",
        description: "A thick, velvety shot of pure joy. Crafted from single-origin Colombian beans, it features a golden-tiger crema with a complex body and rich, sweet finish.",
        origin: "Huila, Colombia",
        roastLevel: "Dark Roast",
        flavorNotes: ["Dark Chocolate", "Caramel", "Citrus Peel"],
        votes: 38,
        ratingSum: 182,
        ratingCount: 38,
        imageUrl: "/images/espresso.png",
        comments: [
          {
            id: "c1",
            name: "Alex M.",
            rating: 5,
            text: "This is the benchmark for a perfect espresso. Dense crema, zero bitterness, pure chocolate notes.",
            date: "2026-06-12T14:30:00.000Z"
          },
          {
            id: "c2",
            name: "Sarah T.",
            rating: 4,
            text: "Very intense and syrup-like. Excellent kick in the morning!",
            date: "2026-06-13T08:15:00.000Z"
          }
        ]
      },
      {
        id: "cappuccino",
        name: "Golden Crema Cappuccino",
        category: "Milk Brew",
        description: "An exquisite balance of rich espresso, steamed milk, and a dense layer of micro-foam, decorated with delicate barista latte art.",
        origin: "Sidamo, Ethiopia",
        roastLevel: "Medium Roast",
        flavorNotes: ["Blueberry", "Honey", "Toasted Almond"],
        votes: 45,
        ratingSum: 215,
        ratingCount: 45,
        imageUrl: "/images/cappuccino.png",
        comments: [
          {
            id: "c3",
            name: "David K.",
            rating: 5,
            text: "The foam is so silky! Almost like drinking velvet. Ethiopia beans shine through.",
            date: "2026-06-11T16:20:00.000Z"
          }
        ]
      },
      {
        id: "cold_brew",
        name: "Caramel Swirl Cold Brew",
        category: "Cold Coffee",
        description: "Steeped slowly for 18 hours in cold spring water to extract sweet flavor notes with low acidity. Served over crystal ice with a ribbon of organic cream.",
        origin: "Antigua, Guatemala",
        roastLevel: "Medium-Dark Roast",
        flavorNotes: ["Cacao Nibs", "Brown Sugar", "Vanilla Bean"],
        votes: 62,
        ratingSum: 298,
        ratingCount: 62,
        imageUrl: "/images/cold_brew.png",
        comments: [
          {
            id: "c4",
            name: "Emma W.",
            rating: 5,
            text: "So smooth! Absolutely perfect for hot afternoons. The vanilla sweetness is very subtle and natural.",
            date: "2026-06-13T10:45:00.000Z"
          }
        ]
      },
      {
        id: "latte",
        name: "Iced Honeycomb Latte",
        category: "Milk Brew",
        description: "Chilled espresso and milk infused with wild honey, poured over ice and crowned with crushed honeycomb candy for a delightful crunch.",
        origin: "Chiapas, Mexico",
        roastLevel: "Medium Roast",
        flavorNotes: ["Floral Honey", "Hazelnut", "Cinnamon"],
        votes: 29,
        ratingSum: 130,
        ratingCount: 29,
        imageUrl: "/images/latte.png",
        comments: [
          {
            id: "c5",
            name: "Lucas B.",
            rating: 4,
            text: "A bit on the sweeter side, but the crunch from the honeycomb makes it a unique experience.",
            date: "2026-06-12T11:10:00.000Z"
          }
        ]
      },
      {
        id: "pour_over",
        name: "Yirgacheffe Bloom Pour Over",
        category: "Filter",
        description: "Hand-brewed meticulously using V60 dripper. Displays tea-like transparency, vibrant acidity, and an incredibly clean floral cup.",
        origin: "Yirgacheffe, Ethiopia",
        roastLevel: "Light Roast",
        flavorNotes: ["Jasmine", "Lemon Zest", "Bergamot"],
        votes: 54,
        ratingSum: 265,
        ratingCount: 54,
        imageUrl: "/images/pour_over.png",
        comments: [
          {
            id: "c6",
            name: "Sophia L.",
            rating: 5,
            text: "This tastes like jasmine tea with coffee undertones. Exquisite light roast!",
            date: "2026-06-13T12:00:00.000Z"
          }
        ]
      }
    ];
  }

  // Reads database file
  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultData = this.getDefaultData();
        await this.write(defaultData);
        return defaultData;
      }
      throw error;
    }
  }

  // Atomic write helper with queueing
  async write(data) {
    // Return a promise that executes when the current queue completes
    const runWrite = async () => {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempPath, this.filePath);
    };

    this.writeQueue = this.writeQueue.then(runWrite).catch(err => {
      console.error("Database write queue error:", err);
      throw err;
    });

    return this.writeQueue;
  }

  // Get all items
  async getItems() {
    return await this.read();
  }

  // Get single item
  async getItemById(id) {
    const items = await this.read();
    return items.find(item => item.id === id);
  }

  // Increment votes
  async incrementVotes(id) {
    const items = await this.read();
    const item = items.find(i => i.id === id);
    if (!item) return null;

    item.votes = (item.votes || 0) + 1;
    await this.write(items);
    return item;
  }

  // Add a rating
  async addRating(id, rating) {
    const items = await this.read();
    const item = items.find(i => i.id === id);
    if (!item) return null;

    item.ratingSum = (item.ratingSum || 0) + Number(rating);
    item.ratingCount = (item.ratingCount || 0) + 1;
    await this.write(items);
    return item;
  }

  // Add a comment / review
  async addComment(id, name, rating, text) {
    const items = await this.read();
    const item = items.find(i => i.id === id);
    if (!item) return null;

    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim() || 'Anonymous Barista',
      rating: Number(rating) || 5,
      text: text.trim(),
      date: new Date().toISOString()
    };

    if (!item.comments) item.comments = [];
    item.comments.unshift(comment); // newest comments first

    // Also update overall rating sum and count
    item.ratingSum = (item.ratingSum || 0) + Number(rating);
    item.ratingCount = (item.ratingCount || 0) + 1;

    await this.write(items);
    return { item, comment };
  }

  // Add new coffee item
  async addItem(newItem) {
    const items = await this.read();
    
    const formattedItem = {
      id: newItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      name: newItem.name.trim(),
      category: newItem.category || 'Espresso',
      description: newItem.description.trim(),
      origin: newItem.origin.trim() || 'Single Origin',
      roastLevel: newItem.roastLevel || 'Medium Roast',
      flavorNotes: newItem.flavorNotes || [],
      votes: 0,
      ratingSum: 0,
      ratingCount: 0,
      imageUrl: newItem.imageUrl || '/images/default.png',
      comments: []
    };

    // Ensure ID is unique
    let finalId = formattedItem.id;
    let counter = 1;
    while (items.some(item => item.id === finalId)) {
      finalId = `${formattedItem.id}_${counter}`;
      counter++;
    }
    formattedItem.id = finalId;

    items.push(formattedItem);
    await this.write(items);
    return formattedItem;
  }
}

// Instantiate with a path
const dbPath = path.join(__dirname, '..', 'data', 'coffee_db.json');
module.exports = new CoffeeDatabase(dbPath);
