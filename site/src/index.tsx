import { render } from "@solidjs/web";
import { Layout } from "./components/Layout";
import { Router } from "./router";
import "./app.css";
import "./maplibre";

const root = document.getElementById("app");
if (!root) throw new Error("#app is missing");

render(
	() => <Router>{(props) => <Layout>{props.children}</Layout>}</Router>,
	root,
);
