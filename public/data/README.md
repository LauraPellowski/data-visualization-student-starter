# MBTA Monthly Ridership By Mode and Line
**Downloaded from**: https://mbta-massdot.opendata.arcgis.com/datasets/2048258a18354256a650d41f8fe4532c_0/explore

**Description**: "This file contains the total and average daily ridership per month by day type (e.g. weekday) and mode (Bus, Rapid Transit, Commuter Rail, Ferry, and the RIDE) and line (for Rapid Transit). The data is available from July 2018 to the most recent month."

**Attributes**:

| Name     | Type     |
| :---     | :---    | 
|month_of_service|Date|
|daytype|Categorical *[Saturday, Sunday, Weekday, Total]*|
|daycount|Quantitative|
|route_or_line|Categorical *[Light Rail, Heavy Rail, Silver Line, Green Line, All Bus, Bus, Blue Line, Orange Line, Red Line, Commuter Rail, The RIDE, Ferry, Mattapan Line, Private Bus, Trackless Trolley]*|
|ridership_total|Quantitative|
|ridership_average|Quantitative|
|ObjectId|Quantitative (unique ID)|