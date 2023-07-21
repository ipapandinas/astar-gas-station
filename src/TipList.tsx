import { useContext, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import React from 'react';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import { ApiContext } from './ApiContext';
import { padding } from '@mui/system';

const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime)

function shortenHash(hash: string): string {
	return `${hash.substring(0, 4)}...${hash.substring(hash.length - 4)}`;
}

function preventDefault(event: any) {
  event.preventDefault();
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface Transaction {
  time: string;
  hash: string;
  from: string;
  gasPrice: string;
  gasUsed: string;
}

interface GasListProps {
  network: string;
}

const TipList: React.FC<GasListProps> = ({ network }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const {
    astarApi,
    astarApiReady,
    shidenApi,
    shidenApiReady,
    shibuyaApi,
    shibuyaApiReady
  } = useContext(ApiContext)

  useEffect(() => {
    if (!network) {
      return;
    }

    const api = network === 'shiden' ? shidenApi : network === 'shibuya' ? shibuyaApi : astarApi;
    const apiReady = network === 'shiden' ? shidenApiReady : network === 'shibuya' ? shibuyaApiReady : astarApiReady;

    if (!api || !apiReady) {
      return;
    }

    const getData = async () => {
      try {
        setTransactions([]);
        const block = await api.rpc.chain.getBlock();
        const blockNumber = block.block.header.number.toNumber();
        const result: Transaction[] = [];

        // invalid url will trigger an 404 error
        const url = `https://${network}.api.subscan.io/api/scan/extrinsics`

        for (let i = 0; i < 5; i++) {
          const body = {
            row: 100,
            block_num: blockNumber - i - 5
          };
          const response = await axios.post(url, body, {
            headers: {
                'x-api-key': '3a2c713fe8b5469a8a298c226a3f3271'
          }})
          const data = response?.data?.data;

          console.log(data);

          if (data?.extrinsics?.length) {
            data.extrinsics.forEach((txn: any) => {
              const transaction: Transaction = {
                time: (dayjs as any).unix(txn.block_timestamp).fromNow(),
                hash: txn.extrinsic_hash,
                from: txn.account_display ? txn.account_display.address : '',
                gasPrice: txn.fee,
                gasUsed: txn.fee_used,
              };
              result.push(transaction);
            });
          }

          await wait(1000);
        }

        setTransactions(result);

      } catch (error: any) {
        console.log(error);
        setError(error.message);
      }
    };

    getData();
  }, [network, astarApiReady, shidenApiReady, shibuyaApiReady]);

  return (
    <>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Tip Usage History
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Txn Hash</TableCell>
            <TableCell>From</TableCell>
            <TableCell>Fee (?)</TableCell>
            <TableCell>Fee Used (Units)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.length ? transactions.map((txn) => (
            <TableRow key={txn.hash}>
              <TableCell>{txn.time}</TableCell>
              <TableCell>
                <a target='_blank' rel='noreferrer' href={`https://${network}.subscan.io/extrinsic/${txn.hash}`}>
                  {shortenHash(txn.hash)}
                </a>
              </TableCell>
              <TableCell>{txn.from}</TableCell>
              <TableCell>{txn.gasPrice}</TableCell>
              <TableCell>{txn.gasUsed}</TableCell>
            </TableRow>
          )) : <Typography align="center" sx={{p: 2}}>...</Typography>}
        </TableBody>
      </Table>
      <a style={{padding: 5}} color="primary" target='_blank' rel='noreferrer' href={`https://${network}.subscan.io/extrinsics`}>
        {'More >'}
      </a>
    </>
  );
}

export default TipList;
