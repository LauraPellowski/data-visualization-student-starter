export const lines = ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];

export async function getAllVehicles() {
  const response = await fetch('https://api-v3.mbta.com/vehicles');
  return response.json();
}

export async function getAllTrains() {
  const response = await fetch(`https://api-v3.mbta.com/vehicles?filter[route]=${lines.join(',')}`);
  return response.json();
}

export async function getVehiclesByLine(line: String) {
  const response = await fetch(`https://api-v3.mbta.com/vehicles?filter[route]=${line}`);
  return response.json();
}

export async function getRouteMapByLine(line: String) {
  const response = await fetch(`https://api-v3.mbta.com/shapes?filter[route]=${line}`);
  return response.json();
}
