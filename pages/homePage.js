import { LOCAL_URL } from "../utils/constants.js"

export class HomePage {

    /**
     * 
     * @param {import("k6/browser").Page} page 
     */
    constructor(page) {
        this.page = page
        this.baseURL = __ENV.BASE_URL || LOCAL_URL
        this.header = page.locator('h1')
        this.newPizzaButton = page.locator('//button[. = "Pizza, Please!"]')
        this.pizzaRecomendationLocator = page.locator('div#recommendations')
    }

    async goto() {
        await this.page.goto(this.baseURL)
    }

    async generateNewRecomendation() {
        await this.newPizzaButton.click()
    }

    async getRecomendationDetails() {
        await this.pizzaRecomendationLocator.waitFor({state: 'visible', timeout: 1000})
        return this.pizzaRecomendationLocator.innerText()
    }

    async getPageHeader() {
        await this.header.waitFor({state: 'visible', timeout: 1000})
        return this.header.innerText()
    }
}