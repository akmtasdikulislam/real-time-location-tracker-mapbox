import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Set your Mapbox public access token from the environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const App = () => {
  // States
  const [locationInfo, setLocationInfo] = useState({});
  const [locationWatchID, setLocationWatchID] = useState();
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  // References
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const markerRef = useRef({});
  const socketRef = useRef();

  // Helper: create a Mapbox marker element with a given color
  const createMarkerElement = (color) => {
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = color;
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
    return el;
  };

  // Helper: create and add a marker to the map
  const addMarker = (userID, longitude, latitude, color = "blue") => {
    const el = createMarkerElement(color);
    const popup = new mapboxgl.Popup({ offset: 25 }).setText(userID);
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(mapRef.current);
    markerRef.current[userID] = marker;
  };

  // Functions
  const handleEnableLocation = () => {
    console.log("Enabling Location");

    const watchID = window.navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log({ latitude, longitude });
        setLocationInfo({ userID: socketRef.current.id, latitude, longitude });
        setIsLocationEnabled(true);
      },
      (error) => {
        console.log(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    setLocationWatchID(watchID);

    if (socketRef.current.disconnected) {
      socketInitialization();
    }
  };

  const handleDisableLocation = () => {
    console.log("Disabling Location");
    navigator.geolocation.clearWatch(locationWatchID);
    setIsLocationEnabled(false);
    setLocationInfo({});
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markerRef.current = {};
    socketRef.current.disconnect();
  };

  const handleTestBtn = () => {
    console.log(markerRef.current);
  };

  const socketInitialization = () => {
    socketRef.current = io("https://192.168.0.215:5000");

    socketRef.current.on("connected", (data) => {
      console.log(data);
    });

    socketRef.current.on("others-location", (data) => {
      Object.keys(data).forEach((key) => {
        // Don't create a marker for the current user
        if (key === socketRef.current.id) return;

        const { userID, latitude, longitude } = data[key];
        const color = userID === socketRef.current.id ? "red" : "blue";
        addMarker(userID, longitude, latitude, color);
      });
    });

    socketRef.current.on("receive-location", (data) => {
      const { userID, latitude, longitude } = data;
      console.log("Received Location:", { longitude, latitude });
      if (mapRef.current) {
        if (markerRef.current[userID]) {
          // Update existing marker position
          markerRef.current[userID].setLngLat([longitude, latitude]);
        } else {
          const color = userID === socketRef.current.id ? "red" : "blue";
          addMarker(userID, longitude, latitude, color);
        }
      }
    });

    socketRef.current.on("remove-marker", (id) => {
      if (markerRef.current[id]) {
        markerRef.current[id].remove();
        delete markerRef.current[id];
      }
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket Disconnected");
      delete markerRef.current[socketRef.current.id];
    });
  };

  // useEffects

  // Initialize map once location is enabled
  useEffect(() => {
    if (isLocationEnabled && mapContainerRef.current && !mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [locationInfo.longitude, locationInfo.latitude],
        zoom: 16,
      });

      mapRef.current.on("load", () => {
        // Add a custom landmark marker (Bangladesh University of Professionals)
        const bupEl = document.createElement("img");
        bupEl.src =
          "https://upload.wikimedia.org/wikipedia/en/9/95/Bangladesh_University_of_Professionals_%28BUP%29_Logo.svg";
        bupEl.style.width = "48px";
        bupEl.style.height = "48px";

        const bupPopup = new mapboxgl.Popup({ offset: 25 }).setText(
          "Bangladesh University of Professionals"
        );

        new mapboxgl.Marker({ element: bupEl })
          .setLngLat([90.35763600418083, 23.83990460043535])
          .setPopup(bupPopup)
          .addTo(mapRef.current);
      });
    }

    return () => {};
  }, [isLocationEnabled]);

  // Emit location updates to socket
  useEffect(() => {
    if (isLocationEnabled && socketRef.current && locationInfo.latitude) {
      socketRef.current.emit("send-location", {
        userID: socketRef.current.id,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      });
    }
  }, [locationInfo]);

  // Initial Socket Connection
  useEffect(() => {
    socketInitialization();
    return () => {
      socketRef.current.off("connected");
      socketRef.current.off("others-location");
      socketRef.current.off("receive-location");
      socketRef.current.off("remove-marker");
      socketRef.current.off("disconnect");
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="bg-auto flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-center my-10">
        Welcome to Real Time Location Tracker App
      </h1>

      <button
        onClick={() => {
          isLocationEnabled ? handleDisableLocation() : handleEnableLocation();
        }}
        className="bg-blue-600 text-blue-50 py-2 px-5 rounded cursor-pointer active:bg-blue-700 hover:bg-blue-500 transition-all ease-in-out"
      >
        {isLocationEnabled ? "Disable" : "Enable"} Location
      </button>

      {isLocationEnabled && (
        <div className="flex flex-md-row flex-col w-full px-md-20 px-5 gap-10">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-center mt-10 mb-5">
              Location Information
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{locationInfo?.latitude}</td>
                  <td>{locationInfo?.longitude}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            onClick={() => handleTestBtn()}
            className="max-w-20 self-center bg-red-600 text-red-50 py-2 px-5 rounded cursor-pointer active:bg-red-700 hover:bg-red-500 transition-all ease-in-out"
          >
            Test
          </button>
          <div className="w-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-center mb-5">
              Live Location
            </h2>
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "500px",
                border: "1px solid black",
              }}
              className="mb-10"
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
