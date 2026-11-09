import { useState } from "react";

// A password box with a Show / Hide button.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={{ width: "100%", boxSizing: "border-box", paddingRight: 64 }}
      />
      <button
        type="button"
        className="link"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--primary)",
          fontSize: 13,
        }}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
