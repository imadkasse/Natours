
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiaW1hZGthc3NlIiwiYSI6ImNtMnlqMDEwbDAxZzIyanM0YjRjMDZ3d3UifQ.hIgHQh5QDrfqw63MIXRZJA'; //
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/imadkasse/cm2ztdxze008i01qt19l28tif',
    scrollZoom: false,
    // center: [-118.113491, 34.111645],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create marker
    const el = document.createElement('div');
    el.className = 'marker';
    // add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    // add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(
        `<p>Day ${loc.day} : ${loc.description}</p>
    `,
      )
      .addTo(map);

    //Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 100,
      right: 100,
    },
  });
};
