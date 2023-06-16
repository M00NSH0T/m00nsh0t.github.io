---
key: 2
title: Slokie AI Chef
excerpt: Combining classical optimization algorithms with ChatGPT to create the optimal mealplan.
permalink: /matrix/
image: matrix.jpg
background-image: matrix.jpg
---

<hr />

This project began way back in 2010, but picked up steam again during the early days of COVID when many COVID-19 survivors reported losing their sense of smell and / or taste. While for most this returns over time, others continue to struggle with this issue months later. Way back in 2010, I was in my final days running my first company, right before Conservation Services Group recruited me. I was working long hours and had very little time to eat regular meals. A friend of mine and I were joking at the time that sometimes it'd be nice to just have an actually healthy meal to just eat in a hurry... one that didn't care at all about taste. 

I immediately thought back to the movie, "The Matrix" and the famous ["tasty wheat scene"](https://www.youtube.com/watch?v=v1EcrD5IyxM). Basically, in this dystopian future where the atmosphere had been ruined and nothing grew above ground, food had to be synthesized. The result was a gelatinous goop... "a single cell protein combined with synthetic aminos, vitamins, and minerals. Everything the body needs." (The Matrix, 1999)

Now there are a million products out there that claim to be healthy meals on the go for you, but looking at the nutrition labels on these, I never really found anything that quite delivered what I wanted. All focused too much on making something "edible." But those days, I was looking for something you'd down like a shot of bad whiskey. Something that got the job done, but didn't necessarily taste good. Not a bar filled with chocolate and peanut butter.

So back to these COVID-19 survivors. Losing their sense of taste is clearly not something anyone would ask for. But perhaps there's some lemonade they can make from these lemons. 

My 2020 goal fo the project aimed to find the optimal list of ingredients necessary to create the perfect meal for people who can't taste. It didn't matter if the ingredients made sense to a chef, just as long as they solve the equation and meet the dietary constraints of a typical adult.

You can see where that project ended on my GitHub page by [clicking here.](https://github.com/M00NSH0T/Matrix_Porridge)

##Enter ChatGPT

In 2023, ChatGPT took the world by storm. Its ability to take well crafted instructions and respond back with everything from rhyming poems to fairly well-written code was a huge leap forward for Machine Learning. Specific to this project, however, I came to realize that ChatGPT might have been the 'missing ingredient' to my Matrix Porridge project. If I gave ChatGPT a list of ingredients, could it craft a meal that actually made sense and tasted good? I started experimenting and realized that there were certainly limits, but there was some real potential here.

After a month or two of work, I figured out how I can leverage the best aspects of both my older Matrix Porridge project along with ChatGPT to create something really functional. As anyone who's watched the original Iron Chef series can attest, there are limits to what you can do with certain ingredients, especially if you are forced to combine them with a specific list of others in a single meal. But, if you instead focus on creating a full day's worth of snacks, main courses and side dishes, the disparate list of ingredients that I can generate from my classical optimization approach becomes much more usable.

So, I build a backend database on GCP that contains tens of thousands of locally optimized ingredient lists, and then created a couple APIs that a web app that I built can use to create optimized meal plans. [Check it out here!](https://slokie.com/pages/slokie-ai-meal-planner)

