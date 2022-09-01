import {NextPage} from "next";
import {useState} from "react";
import bcrypt from "bcryptjs";

const Home: NextPage = () => {

    const [hash, setHash] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div>
            <h1>Im here</h1>
            <input type={"text"} onChange={(event) => {setPassword(event.target.value)}}/>
            <button onClick={() => {setHash(bcrypt.hashSync(password, bcrypt.genSaltSync(10)))}}>Generate Hash</button>
            <strong>{hash}</strong>
        </div>
    )
};

export default Home;