import { Router, Request, Response } from "express";
import admin from "../firebaseConfig"; // Importe a configuração do Firebase
// import { createNexusClient } from "@biconomy/sdk";
const {
    createNexusClient,
    createBicoPaymasterClient,
} = require("@biconomy/sdk");
import { baseSepolia } from "viem/chains";
import { http, parseEther } from "viem";
import { json } from "body-parser";

import { privateKeyToAccount } from "viem/accounts";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const db = admin.firestore();
        const doc = await db.collection("users").doc(id).get();

        if (!doc.exists) {
            res.status(404).send({ error: "Document not found" });
            return;
        }

        const docData = doc.data();

        res.status(200).send(docData);
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

router.post("/transaction", async (req: Request, res: Response) => {
    try {
        const { privateKey, to, amount, params } = await req.body;

        const account = privateKeyToAccount(`0x${privateKey}`);
        const bundlerUrl = process.env.BUNDLERS_URL;
        const paymasterUrl = process.env.PAYMASTER_URL;

        const nexusClient = await createNexusClient({
            signer: account,
            chain: baseSepolia,
            transport: http(),
            bundlerTransport: http(bundlerUrl),
            paymasterUrl: createBicoPaymasterClient({ paymasterUrl }),
        });

        console.log("Nexus client created", nexusClient);
        const smartAccountAddress = await nexusClient.account.address;

        console.log("Smart account address: ", smartAccountAddress);

        const hash = await nexusClient.sendTransaction({
            calls: [{ to: to, value: parseEther("0") }],
        });
        console.log("Transaction hash: ", hash);
        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log("Transaction receipt: ", receipt);

        res.status(200).send({ hash, receipt });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

export default router;
