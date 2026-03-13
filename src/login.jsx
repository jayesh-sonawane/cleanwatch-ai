import { useState } from "react";

function Login({ onLogin }) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {

    if (username === "user" && password === "pass") {
      localStorage.setItem("loggedIn", "true");
      onLogin(true);
    } else {
      setError("Invalid Username or Password");
    }

  };

  return (

    <div style={styles.container}>

      <div style={styles.card}>

        
		<h1>♻️ CleanWatch AI</h1>
        <p style={styles.subtitle}>Smart Waste Monitoring</p>

        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleLogin}>
          Login
        </button>

        {error && <p style={styles.error}>{error}</p>}

      </div>

    </div>

  );
}

const styles = {

  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#1d976c,#93f9b9)"
  },

  card: {
    background: "white",
    padding: "40px",
    borderRadius: "10px",
    width: "320px",
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  },

  title: {
    marginBottom: "5px"
  },

  subtitle: {
    marginBottom: "25px",
    color: "#666"
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc"
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "#1d976c",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer"
  },

  error: {
    marginTop: "10px",
    color: "red"
  }

};

export default Login;