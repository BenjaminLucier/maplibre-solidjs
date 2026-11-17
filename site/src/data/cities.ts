import type { FeatureCollection, Point } from "geojson";

const CITIES: [name: string, lng: number, lat: number, population: number][] = [
	["Tokyo", 139.6917, 35.6895, 37.4],
	["Delhi", 77.209, 28.6139, 32.9],
	["Shanghai", 121.4737, 31.2304, 29.2],
	["São Paulo", -46.6333, -23.5505, 22.6],
	["Mexico City", -99.1332, 19.4326, 22.1],
	["Cairo", 31.2357, 30.0444, 21.8],
	["Mumbai", 72.8777, 19.076, 21.3],
	["Beijing", 116.4074, 39.9042, 21.3],
	["Dhaka", 90.4125, 23.8103, 23.2],
	["Osaka", 135.5023, 34.6937, 19.0],
	["New York", -74.006, 40.7128, 18.9],
	["Karachi", 67.0011, 24.8607, 17.2],
	["Buenos Aires", -58.3816, -34.6037, 15.5],
	["Istanbul", 28.9784, 41.0082, 15.8],
	["Lagos", 3.3792, 6.5244, 15.9],
	["Manila", 120.9842, 14.5995, 14.7],
	["Rio de Janeiro", -43.1729, -22.9068, 13.7],
	["Los Angeles", -118.2437, 34.0522, 12.5],
	["Moscow", 37.6173, 55.7558, 12.7],
	["Paris", 2.3522, 48.8566, 11.2],
	["London", -0.1276, 51.5072, 9.6],
	["Sydney", 151.2093, -33.8688, 5.4],
	["Nairobi", 36.8219, -1.2921, 5.3],
	["Toronto", -79.3832, 43.6532, 6.3],
];

/** Large cities, with metro population in millions. */
export const cities: FeatureCollection<
	Point,
	{ name: string; population: number }
> = {
	type: "FeatureCollection",
	features: CITIES.map(([name, lng, lat, population]) => ({
		type: "Feature",
		properties: { name, population },
		geometry: { type: "Point", coordinates: [lng, lat] },
	})),
};
