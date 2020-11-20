export default geo_tz;

interface IGeometry {
  type: string;
  coordinates: number[];
}

interface IGeoJson {
  type: string;
  geometry: IGeometry;
  bbox?: number[];
  properties?: any;
}

type MapLike = {
  get: (key: string) => IGeoJson;
  set: (key: string, payload: IGeoJson) => MapLike;
};

type CacheStore = Map<string, IGeoJson> | MapLike;

declare function geo_tz(lat: number, lon: number): string[];

declare namespace geo_tz {
  function setCache({
    preload,
    store,
  }: {
    preload?: boolean;
    store?: CacheStore;
  }): void;
}
