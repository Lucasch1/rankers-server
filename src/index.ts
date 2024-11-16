import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import firebaseRoutes from "./routes/firebaseRoute";
import biconomyRoutes from "./routes/biconomyRoute";
import dotenv from "dotenv";

const app = express();

app.use(
    cors({
        credentials: true,
    })
);

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/firebase", firebaseRoutes);
app.use("/biconomy", biconomyRoutes);

const server = http.createServer(app);

server.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
