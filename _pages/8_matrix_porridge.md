---
key: 2
title: Slokie AI Chef
excerpt: A practical whole-day meal planner that brings restaurant orders, easy home meals, and transparent nutrition calculations together.
permalink: /matrix/
image: matrix.jpg
background-image: matrix.jpg
---

## Good food. A day that works.

Slokie AI Chef is a meal-planning experiment built around a simple lesson: getting a whole day to work is more practical than asking every individual meal to be perfectly balanced.

The current app starts with food you actually want to eat. Add a restaurant order, a quick meal at home, a snack, or a drink, then ask it to fill the remaining meals. Adjust the portions and daily targets, and inspect the ingredients behind the numbers.

### Try the live planner

[Open Slokie AI Chef in its own window](https://slokie-recipes-web-142395921602.us-east1.run.app/){:target="_blank" rel="noopener"}

<div class="chef-live-demo">
  <iframe src="https://slokie-recipes-web-142395921602.us-east1.run.app/" title="Slokie AI Chef — interactive whole-day meal planner" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
</div>

*The embedded app is live. Saving a day is optional and stays in your browser. Some browsers restrict saving inside embeds; use the separate window if needed. Optional AI preparation tips send the plan to Google's AI service and cache the generated guidance on the server.*

### What the current version does

- Combines quick home meals, restaurant estimates, drinks, and individual USDA foods in one editable day.
- Searches a refreshed catalog of 5,752 USDA reference foods, including oat milk, with links to the original records.
- Suggests practical portions from a small quick-meal collection while keeping the items already chosen.
- Checks calories, protein, fiber, and saturated fat independently of the language model, with a separate sodium callout and an optional sodium limit for suggestions.
- Uses ranges for uncertain restaurant calories and keeps missing nutrients visibly unknown.
- Offers optional preparation tips from a low-cost AI model.

This is an early working version. The meal collection is intentionally small, restaurant estimates are not verified nutrition labels, and the checks do not cover all vitamins and minerals. Targets are editable examples, not personalized medical advice. The goal is useful, inspectable planning that can improve as the food collection and feedback grow.

### From Matrix Porridge to meals people want to eat

The idea began around 2010 with a question about fast, nutritionally complete food, inspired by the “tasty wheat” scene in *The Matrix*. I revisited it in 2020, exploring optimization algorithms that could select ingredients subject to dietary constraints. The [original Matrix Porridge code](https://github.com/M00NSH0T/Matrix_Porridge) documents that earlier approach.

In 2023, I added language models to turn optimized ingredient lists into meal ideas and built a Google Cloud backend containing tens of thousands of ingredient combinations. That work exposed the more useful unit of planning: a day of meals and snacks, with room for different foods to contribute different things.

The September 2026 reboot builds on that lesson. It separates the food arithmetic from AI-generated advice and puts everyday choices first: taste, convenience, portions, and the uncertainty of eating out. The [original recipe library](https://slokie-recipes-web-142395921602.us-east1.run.app/library) remains available as part of the project's history.

