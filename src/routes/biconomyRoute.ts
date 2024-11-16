import { Router, Request, Response } from "express";
import admin from "../firebaseConfig"; // Importe a configuração do Firebase
import { baseSepolia } from "viem/chains";
import { http, parseEther } from "viem";
import { ethers } from "ethers";
import { abi } from "../../hhat/artifacts/contracts/Rankers.sol/Rankers.json";
const {
    createNexusClient,
    createBicoPaymasterClient,
} = require("@biconomy/sdk");

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
            paymaster: createBicoPaymasterClient({ paymasterUrl }),
        });

        // console.log("Nexus client created", nexusClient);

        const smartAccountAddress = await nexusClient.account.address;

        console.log("Smart account: ", smartAccountAddress);

        // console.log("Smart account address: ", smartAccountAddress);

        const hash = await nexusClient.sendTransaction({
            calls: [{ to: to, value: parseEther("0") }],
        });
        console.log("Transaction hash: ", hash);
        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        // Converter valores BigInt para string
        const receiptStringified = JSON.parse(
            JSON.stringify(receipt, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        );

        res.status(200).send({ hash, receipt: receiptStringified });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

router.post("/rankersCreate", async (req: Request, res: Response) => {
    try {
        const { privateKey, params, functionName } = await req.body;
        const url = process.env.RPC_URL as string;
        const provider = new ethers.JsonRpcProvider(url);
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(
            `${process.env.RANKERS_ADDRESS}`,
            abi,
            signer
        );

        const createGoalFunction = contract.getFunction(functionName);

        const mintTx = await createGoalFunction.populateTransaction(
            params.name,
            params.description,
            params.category,
            params.frequency,
            params.target,
            params.minimumBet,
            params.startDate,
            params.endDate,
            params.isPublic,
            params.preFund,
            params.maxParticipants,
            params.uri,
            params.typeTargetFreq,
            params.quantity,
            params.numFreq,
            params.prompt
        );

        console.log(mintTx);

        const tx = {
            to: `${process.env.RANKERS_ADDRESS}`,
            data: mintTx.data!,
        };

        const account = privateKeyToAccount(`0x${privateKey}`);

        const bundlerUrl = process.env.BUNDLERS_URL;
        const paymasterUrl = process.env.PAYMASTER_URL;

        const nexusClient = await createNexusClient({
            signer: account,
            chain: baseSepolia,
            transport: http(),
            bundlerTransport: http(bundlerUrl),
            paymaster: createBicoPaymasterClient({ paymasterUrl }),
        });

        const hash = await nexusClient.sendTransaction({
            calls: [tx],
        });
        console.log("Transaction hash: ", hash);
        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        const receiptStringified = JSON.parse(
            JSON.stringify(receipt, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        );

        res.status(200).send({ hash, receipt: receiptStringified });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

export default router;
