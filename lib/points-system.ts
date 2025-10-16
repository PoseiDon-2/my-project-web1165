"use client"
import { v4 as uuidv4 } from "uuid";
import { type UserPoints, type PointsTransaction, type Reward, POINTS_CONFIG, USER_LEVELS } from "@/types/rewards";

export class PointsSystem {
  private static instance: PointsSystem;
  private userPoints: Map<string, UserPoints> = new Map();

  static getInstance(): PointsSystem {
    if (!PointsSystem.instance) {
      PointsSystem.instance = new PointsSystem();
    }
    return PointsSystem.instance;
  }

  // Calculate points from donation amount
  calculateDonationPoints(amount: number, type: "money" | "item" | "volunteer"): number {
    switch (type) {
      case "money":
        return Math.floor(amount / 100) * POINTS_CONFIG.MONEY_DONATION;
      case "item":
        return POINTS_CONFIG.ITEM_DONATION;
      case "volunteer":
        return amount * POINTS_CONFIG.VOLUNTEER_HOURS;
      default:
        return 0;
    }
  }

  // Get user level based on total points
  getUserLevel(totalPoints: number) {
    const level =
      USER_LEVELS.slice()
        .reverse()
        .find((l) => totalPoints >= l.minPoints) || USER_LEVELS[0];
    const nextLevel = USER_LEVELS.find((l) => l.minPoints > totalPoints);

    return {
      ...level,
      nextLevelPoints: nextLevel ? nextLevel.minPoints : level.minPoints,
      progress: nextLevel
        ? ((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
        : 100,
    };
  }

  // Add points to user and check for new rewards
  async addPoints(
    userId: string,
    source: string,
    amount: number,
    description: string,
    relatedId?: string
  ): Promise<UserPoints> {
    try {
      const currentPoints = await this.getUserPoints(userId);
      const earnedPoints: number = 50;
      const transaction: PointsTransaction = {
        id: uuidv4(),
        type: "earned",
        amount: earnedPoints,
        source,
        description,
        date: new Date().toISOString(),
        relatedId,
      };

      const response = await fetch(`/api/points/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: transaction.type,
          amount,
          source,
          description,
          relatedId,
          transactionId: transaction.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add points: ${response.statusText}`);
      }

      const { totalPoints, availablePoints, newReward } = await response.json();
      const level = this.getUserLevel(totalPoints);

      const updatedPoints: UserPoints = {
        ...currentPoints,
        totalPoints,
        availablePoints,
        level: level.level,
        levelName: level.name,
        nextLevelPoints: level.nextLevelPoints,
        progress: level.progress,
        color: level.color,
        pointsHistory: [transaction, ...currentPoints.pointsHistory],
      };

      this.userPoints.set(userId, updatedPoints);
      await this.saveToStorage();

      return updatedPoints;
    } catch (error) {
      console.error("Error adding points:", error);
      throw error;
    }
  }

  // Spend points
  async spendPoints(
    userId: string,
    amount: number,
    source: string,
    description: string,
    relatedId?: string
  ): Promise<boolean> {
    try {
      const currentPoints = await this.getUserPoints(userId);

      if (currentPoints.availablePoints < amount) {
        return false;
      }

      const transaction: PointsTransaction = {
        id: uuidv4(),
        type: "spent",
        amount,
        source,
        description,
        date: new Date().toISOString(),
        relatedId,
      };

      const response = await fetch(`/api/points/spend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: transaction.type,
          amount,
          source,
          description,
          relatedId,
          transactionId: transaction.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to spend points: ${response.statusText}`);
      }

      const updatedPoints: UserPoints = {
        ...currentPoints,
        availablePoints: currentPoints.availablePoints - amount,
        pointsHistory: [transaction, ...currentPoints.pointsHistory],
      };

      this.userPoints.set(userId, updatedPoints);
      await this.saveToStorage();

      return true;
    } catch (error) {
      console.error("Error spending points:", error);
      throw error;
    }
  }

  // Get user points
  async getUserPoints(userId: string, token?: string): Promise<UserPoints> {
    try {
      await this.loadFromStorage();

      if (!this.userPoints.has(userId)) {
        const apiUrl = `/api/points/${userId}`;
        console.log(`Fetching points for userId: ${userId} from ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        console.log("API Response Status:", response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`Failed to fetch user points: ${response.statusText} (${response.status})`);
        }

        const transactions = await response.json();
        console.log("API Response Data:", transactions);

        const typedTransactions: PointsTransaction[] = transactions.map((t: any) => {
          if (!["earned", "spent"].includes(t.type)) {
            console.warn(`Invalid transaction type: ${t.type}, defaulting to "earned"`);
            return {
              id: t.id,
              type: "earned" as "earned" | "spent",
              amount: t.amount,
              source: t.source,
              description: t.description,
              date: t.date,
              relatedId: t.relatedId ?? undefined,
            };
          }
          return {
            id: t.id,
            type: t.type as "earned" | "spent",
            amount: t.amount,
            source: t.source,
            description: t.description,
            date: t.date,
            relatedId: t.relatedId ?? undefined,
          };
        });

        const totalPoints = typedTransactions
          .filter((t) => t.type === "earned")
          .reduce((sum, t) => sum + t.amount, 0);
        const availablePoints = typedTransactions.reduce((sum, t) => {
          return t.type === "earned" ? sum + t.amount : sum - t.amount;
        }, 0);
        const level = this.getUserLevel(totalPoints);

        const initialPoints: UserPoints = {
          userId,
          totalPoints,
          availablePoints,
          pointsHistory: typedTransactions,
          level: level.level,
          levelName: level.name,
          nextLevelPoints: level.nextLevelPoints,
          progress: level.progress,
          color: level.color,
        };
        this.userPoints.set(userId, initialPoints);
      }

      return this.userPoints.get(userId)!;
    } catch (error) {
      console.error("Error fetching user points:", error);
      throw error;
    }
  }

  // Get user rewards
  async getUserRewards(userId: string, token?: string): Promise<Reward[]> {
    try {
      const apiUrl = `/api/rewards/${userId}`;
      console.log(`Fetching rewards for userId: ${userId} from ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      console.log("API Response Status:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Failed to fetch user rewards: ${response.statusText} (${response.status})`);
      }

      const rewards = await response.json();
      console.log("API Response Data:", rewards);

      return rewards as Reward[];
    } catch (error) {
      console.error("Error fetching user rewards:", error);
      throw error;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10): Promise<UserPoints[]> {
    try {
      await this.loadFromStorage();

      const response = await fetch(`/api/leaderboard?limit=${limit}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }

      const users = await response.json();

      const leaderboard: UserPoints[] = users.map((user: any) => {
        const transactions = user.pointsTransactions.map((t: any) => {
          if (!["earned", "spent"].includes(t.type)) {
            console.warn(`Invalid transaction type: ${t.type}, defaulting to "earned"`);
            return {
              id: t.id,
              type: "earned" as "earned" | "spent",
              amount: t.amount,
              source: t.source,
              description: t.description,
              date: t.date,
              relatedId: t.relatedId ?? undefined,
            };
          }
          return {
            id: t.id,
            type: t.type as "earned" | "spent",
            amount: t.amount,
            source: t.source,
            description: t.description,
            date: t.date,
            relatedId: t.relatedId ?? undefined,
          };
        });

        const totalPoints = transactions
          .filter((t: any) => t.type === "earned")
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        const availablePoints = transactions.reduce((sum: number, t: any) => {
          return t.type === "earned" ? sum + t.amount : sum - t.amount;
        }, 0);
        const level = this.getUserLevel(totalPoints);

        return {
          userId: user.id,
          totalPoints,
          availablePoints,
          pointsHistory: transactions,
          level: level.level,
          levelName: level.name,
          nextLevelPoints: level.nextLevelPoints,
          progress: level.progress,
          color: level.color,
        };
      });

      return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      throw error;
    }
  }

  // Save to localStorage (optional, as backup)
  private async saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("userPoints", JSON.stringify(Array.from(this.userPoints.entries())));
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    }
  }

  // Load from localStorage (optional, as fallback)
  private async loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("userPoints");
        if (stored) {
          const entries = JSON.parse(stored);
          this.userPoints = new Map(entries);
        }
      } catch (error) {
        console.error("Failed to load from localStorage:", error);
      }
    }
  }
}

export const pointsSystem = PointsSystem.getInstance();