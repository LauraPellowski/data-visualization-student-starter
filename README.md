# data-visualization-student-starter

Starter repository for student assignments for the data visualization course [Constructing Visualizations](https://github.com/curran/constructing-visualizations).

How to use, for the first assignment:

- Fork this repository
- Modify the content of `src/assignments/week-01` as the first assignment
- Deploy your project using GitHub Pages (you may need to change `base` in `vite.config.ts`, depending on your repository name)
- Submit the link to your repo and hosted site

How to use, for subsequent assignments:

- Add a new directory `src/assignments`, potentially by copying a previous assignment as a starter, or copying files in from `src/examples` in [constructing-visualizations](https://github.com/curran/constructing-visualizations)
- Update the index at `src/assignments/index.ts` to add the new listing
- Redeploy to GitHub pages
- Submit the link to your hosted assignment in GitHub pages

# Week 1
Summary: altered starter code in the following ways:
- Changed shape from circle to square
- Added blue/purple/pink color gradient
- Made data points bigger
- Added transition to make data points appear one at a time
- Ran `npm audit fix` as there were some vulnerabilities
- Added `.npmrc` file and min-release-age
- Ran `npm run prettier` 