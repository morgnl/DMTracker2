export class MonsterAPI {
    static BASE_URL = 'https://www.dnd5eapi.co/api';
    static IMG_BASE_URL = 'https://www.dnd5eapi.co';

    static async searchMonsters(query) {
        if (!query || query.length < 2) return [];
        
        try {
            console.log('Searching for monsters:', query);
            const response = await fetch(`${this.BASE_URL}/monsters?name=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Search results:', data.results);
            return data.results || [];
        } catch (error) {
            console.error('Error searching monsters:', error);
            return [];
        }
    }

    static async getMonsterDetails(index) {
        try {
            console.log('Getting monster details for:', index);
            const response = await fetch(`${this.BASE_URL}/monsters/${index}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Monster details:', data);
            return data;
        } catch (error) {
            console.error('Error fetching monster details:', error);
            return null;
        }
    }

    static async getMonsterImage(index) {
        const monster = await this.getMonsterDetails(index);
        if (monster && monster.image) {
            return `${this.IMG_BASE_URL}${monster.image}`;
        }
        return null;
    }
}