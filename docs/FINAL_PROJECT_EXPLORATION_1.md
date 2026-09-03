# Final Project Exploration 1

## Topic / Domain

I want to explore data related to the MBTA. There is a bunch of cool things to learn about the subway, commuter rail, bus, and ferry lines.

## Questions to Investigate Through Data Visualization

1. Which line has the largest ridership? Which has the smallest?
2. How does ridership vary throughout the week? Throughout the year?
3. How often is the subway/bus late?
4. This question is very specific to me, but I want to answer the question: what opportunities do I have to see a train on my morning commute to work? I know of 2 places where the highway passes under the commuter rail, and I have seen trains go by a handful of times. I want to optimize my commute so that I can see more trains.

## Potential Datasets/Data Sources

1. [MBTA Open Data Portal](https://mbta-massdot.opendata.arcgis.com/)
   - [MBTA Monthly Ridership By Mode and Line](https://mbta-massdot.opendata.arcgis.com/datasets/2048258a18354256a650d41f8fe4532c_0/explore)
   - [Fall 2024 MBTA Rail Ridership by SDP Time Period, Route/Line, and Stop](https://mbta-massdot.opendata.arcgis.com/datasets/d4610a65064a4d3c8536c75d520e0012_0/explore)
   - [MBTA Commuter Rail Ridership by Trip, Season, Route Line, and Stop.](https://mbta-massdot.opendata.arcgis.com/datasets/9e8089a985f24bc6a1dbae1e69703808_0/explore)

2. [MBTA API](https://www.mbta.com/developers/v3-api) (live data)

## Related Visualizations/Articles/Projects/Etc

Some websites with visualizations of MBTA data to serve as inspiration:

1. https://mbtaviz.github.io/
2. https://www.mbta.com/performance-metrics
3. https://transitmatters.org/
4. https://maps.massgis.digital.mass.gov/MassMapper/MassMapper.html
5. https://public.tableau.com/app/profile/joseph.true/viz/MBTA_15997912581680/Dashboard1
6. https://mbta.sites.fas.harvard.edu/T/subway-map.html

## Rough Sketches

1. Total ridership by line: Use data for the total ridership by line, and create circles with diameters proportional to the total ridership value for each of the lines.
   ![Sketch 1](<Screenshot 2026-09-02 203241.png>)

2. Prediction accuracy: Pie chart showing the accurate predictions vs the total predictions. Drop down to allow user to select which line to look at.
   ![Sketch 2](<Screenshot 2026-09-02 203246.png>)

3. Live map: use live data and visualize where each subway car is in real time.
   ![Sketch 3](<Screenshot 2026-09-02 203254.png>)

4. If the line has a set schedule that doesn't vary each day (like on weekdays, for instance), record the average "actual" time, as well as recent actual times.
   ![Sketch 4](<Screenshot 2026-09-02 203302.png>)

5. Another map, where you can hover over the line and it will highlight it. Possibly can include other information about the line as well.
   ![Sketch 5](<Screenshot 2026-09-02 203307.png>)
