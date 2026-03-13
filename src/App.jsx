import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Login from "./Login";



delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});


function HeatmapLayer({ points }) {

  const map = window.mapInstance;

  if (!map || points.length === 0) return null;

  const heat = L.heatLayer(points, {
    radius: 25,
    blur: 15,
    maxZoom: 10
  });

  heat.addTo(map);

  return null;
}

function AutoZoom({ complaints }) {

  const map = useMap();

  useEffect(() => {

    const validPoints = complaints.filter(
      c => c.latitude && c.longitude
    );

    if (validPoints.length === 0) return;

    const bounds = validPoints.map(c => [
      Number(c.latitude),
      Number(c.longitude)
    ]);

    map.fitBounds(bounds, { padding: [50, 50] });

  }, [complaints, map]);

  return null;
}


function App() {

const [loggedIn, setLoggedIn] = useState(false);

useEffect(() => {

  const status = localStorage.getItem("loggedIn");

  if (status === "true") {
    setLoggedIn(true);
  }

}, []);



  const API_URL = "https://l8lhla7z2j.execute-api.us-east-1.amazonaws.com/";

  const [reportText, setReportText] = useState("");
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [areaNames, setAreaNames] = useState({});
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ===============================
  // GPS
  // ===============================
  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true }
      );
    });
  };

  // ===============================
  // Camera
  // ===============================
  const startCamera = async () => {

  try {

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" } // prefer back camera
      },
      audio: false
    });

    streamRef.current = stream;
    setCameraActive(true);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, 200);

  } catch {

    alert("Camera not accessible");

  }
};


  const capturePhoto = async () => {

    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    setImage(base64);

    streamRef.current?.getTracks().forEach(track => track.stop());

    setCameraActive(false);

    await getLocation();

  };

  // ===============================
  // Submit Complaint
  // ===============================
  const analyzeWaste = async () => {

    if (!image) {
      setStatus("Please upload image ❗");
      return;
    }

    try {

      setStatus("🔍 AI analyzing image...");
      setResult(null);

      const loc = location || await getLocation();

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: reportText,
          image: image,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Server error ❌");
        return;
      }

      if (data.analysis) {

        // Garbage detected
        setResult(data.analysis);
        setStatus("✅ Complaint registered successfully");

        loadComplaints();

      } else if (data.message) {

        // Garbage NOT detected
        setResult(null);
        setStatus("⚠️ " + data.message);

      } else {

        setStatus("❌ Complaint not registered");

      }

      setReportText("");
      setImage(null);

    } catch (error) {

      console.error(error);
      setStatus("Network error ❌");

    }

  };

  // ===============================
  // Load Complaints
  // ===============================
  const loadComplaints = async () => {

    try {

      const response = await fetch(API_URL);

      const data = await response.json();

      if (!response.ok) {
        setStatus("Failed loading complaints ❌");
        return;
      }

      const sorted = data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setComplaints(sorted);
	  
	  sorted.forEach(async (item) => {

  if (item.latitude && item.longitude) {

    const key =
      Number(item.latitude).toFixed(3) +
      "," +
      Number(item.longitude).toFixed(3);

    if (!areaNames[key]) {

      const area = await getAreaName(item.latitude, item.longitude);

      setAreaNames(prev => ({
        ...prev,
        [key]: area
      }));

    }

  }

});


      if (sorted.length > 0) setResult(sorted[0]);

    } catch {

      setStatus("Load error ❌");

    }

  };

  useEffect(() => {
    loadComplaints();
  }, []);

const heatPoints = complaints
  .filter(c => c.latitude && c.longitude)
  .map(c => [
    Number(c.latitude),
    Number(c.longitude),
    c.severity === "high" ? 1 :
    c.severity === "moderate" ? 0.6 : 0.3
  ]);
 
 // ===============================
// Garbage Hotspot Ranking
// ===============================

const hotspotCounts = {};

complaints.forEach((c) => {

  if (!c.latitude || !c.longitude) return;

  const key =
    Number(c.latitude).toFixed(3) +
    "," +
    Number(c.longitude).toFixed(3);

  if (!hotspotCounts[key]) {
    hotspotCounts[key] = {
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      count: 0
    };
  }

  hotspotCounts[key].count++;

});

const hotspotRanking = Object.values(hotspotCounts)
  .sort((a, b) => b.count - a.count)
  .slice(0, 5);
  
  // =============================== name co ordinate
  const getAreaName = async (lat, lon) => {

  try {

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );

    const data = await response.json();

    return data.address?.suburb ||
           data.address?.neighbourhood ||
           data.address?.city ||
           data.display_name;

  } catch (err) {

    return "Unknown Area";

  }

};

if (!loggedIn) {
  return <Login onLogin={setLoggedIn} />;
}


  // ===============================
  // UI
  // ===============================
  return (
  

  <div style={{ padding: 40, maxWidth: 900, margin: "auto" }}>

    {/* Header */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >

      <h1>♻️ CleanWatch AI</h1>

      <button
        onClick={()=>{
          localStorage.removeItem("loggedIn");
          window.location.reload();
        }}
        style={{
          backgroundColor: "#ff7a00",
          color: "white",
          border: "none",
          padding: "10px 18px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        Logout
      </button>

    </div>
	

      <h2>Report Waste</h2>

      <input
        type="text"
        placeholder="Describe waste..."
        value={reportText}
        onChange={(e) => setReportText(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 15 }}
      />

      <br />

      {!cameraActive && (
        <button onClick={startCamera}>📷 Open Camera</button>
      )}

      <br />

      {cameraActive && (
        <div>
          <video ref={videoRef} autoPlay playsInline width="300" />
          <br />
          <button onClick={capturePhoto}>Capture Photo</button>
        </div>
      )}

      {image && !cameraActive && (
        <div style={{ marginTop: 10 }}>

          <img
            src={`data:image/jpeg;base64,${image}`}
            alt="preview"
            width="300"
          />

          {location && (
            <p style={{ fontSize: 12 }}>
              📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          )}

        </div>
      )}

      <br />

      <button onClick={analyzeWaste}>Submit Complaint</button>

      {/* Status with color */}
      <p>
        <strong>Status:</strong>
        <span
          style={{
            marginLeft: 8,
            fontWeight: "bold",
            color:
              status.includes("⚠️")
                ? "orange"
                : status.includes("❌")
                ? "red"
                : status.includes("✅")
                ? "green"
                : "black"
          }}
        >
          {status}
        </span>
      </p>

{result && (
  <div
    style={{
      padding: "20px",
      border: "1px solid #ccc",
      marginTop: "10px",
      borderRadius: "8px",
      background: "#f9f9f9"
    }}
  >
    

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "10px"
      }}
    >
      {/* Left Side Content */}
      <div style={{ flex: 1 }}>
       <h3 style={{ marginBottom: "15px" }}>Latest Analysis</h3>
		                <p>
                  <strong>Severity:</strong>{" "}
                  <span
                    style={{
                      color:
                        result.severity === "high"
                          ? "red"
                          : result.severity === "moderate"
                          ? "orange"
                          : "green",
                      fontWeight: "bold"
                    }}
                  >
                    {result.severity}
                  </span>
                </p>

        <p><b>Waste Type:</b> {result.waste_type?.join(", ")}</p>
		<p><b>Complaint ID:</b> {result.complaint_id}</p>


      </div>

      {/* Right Side Image */}
      <div>
        <img
          src={result.image_url}
          alt="preview"
          style={{
            width: "200px",
            borderRadius: "6px",
            border: "1px solid #ddd"
          }}
        />
      </div>
	         
    </div>
	 <p><b>Description:</b> {result.explanation}</p>

        <p><b>Recommended Action:</b> {result.recommended_action}</p>
  </div>
)}

      {/* MAP */}
      {complaints.length > 0 && (
        <>

          <h2>🗺 Complaint Map</h2>


		  <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: 400 }}
			whenCreated={(map) => (window.mapInstance = map)}
          >

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
			<AutoZoom complaints={complaints} />
			{heatPoints.length > 0 && (
			  <HeatmapLayer points={heatPoints} />
			)}
            {complaints.map((item, i) =>
              item.latitude && item.longitude ? (

                <Marker
                  key={i}
                  position={[
                    Number(item.latitude),
                    Number(item.longitude)
                  ]}
                >

                  <Popup>
                    <b>{item.severity}</b><br />
                    {item.explanation}
                  </Popup>

                </Marker>

              ) : null
            )}

          </MapContainer>

        </>
      )}

<h2>🔥 Top Garbage Hotspots</h2>

{hotspotRanking.map((spot, i) => {

  const key =
    spot.lat.toFixed(3) + "," + spot.lng.toFixed(3);

  return (
    <div
      key={i}
      style={{
        border: "1px solid #ddd",
        padding: "10px",
        marginBottom: "10px",
        borderRadius: "8px"
      }}
    >

      <b>#{i + 1}</b> {areaNames[key] || "Loading area..."}  {spot.lat} , {spot.lng};

      <br />

      Complaints: {spot.count}

    </div>
  );

})}

      {/* Complaint History */}
      {complaints.length > 0 && (

        <div style={{ marginTop: "40px" }}>

          <h2>📊 Complaint History</h2>

          {complaints.map((item, index) => (

            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "10px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                backgroundColor: "#ffffff"
              }}
            >

              {/* IMAGE */}
              <div style={{ marginRight: "15px" }}>

                {item.image_url ? (

                  <img
                    src={item.image_url}
                    alt="Waste"
                    style={{
                      width: "90px",
                      height: "90px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ccc"
                    }}
                  />

                ) : (

                  <div
                    style={{
                      width: "90px",
                      height: "90px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#777",
                      border: "1px solid #ccc"
                    }}
                  >
                    No Image
                  </div>

                )}

              </div>

              {/* DETAILS */}
              <div style={{ flex: 1, fontSize: "12px" }}>

                <p><strong>ID:</strong> {item.complaint_id}</p>

                <p>
                  <strong>Severity:</strong>{" "}
                  <span
                    style={{
                      color:
                        item.severity === "high"
                          ? "red"
                          : item.severity === "moderate"
                          ? "orange"
                          : "green",
                      fontWeight: "bold"
                    }}
                  >
                    {item.severity}
                  </span>
                </p>

                <p><strong>Waste Type:</strong> {item.waste_type?.join(", ")}</p>

                <p><strong>Report:</strong> {item.explanation || "No description"}</p>
				<p><b>Recommended Action:</b> {item.recommended_action}</p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(item.created_at).toLocaleString()}
                </p>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}

export default App;