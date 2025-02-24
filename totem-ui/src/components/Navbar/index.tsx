import Image from "next/image";
import Logo from "@/assets/Logo.svg";
import {ArrowTopRightIcon} from "@radix-ui/react-icons"

export default function Navbar() {
    return (
        <nav className={"w-full h-24 flex flex-row justify-center items-center content-center"}>
            <div className={"w-11/12 flex flex-row justify-between items-center content-center"}>
                <div className={"flex flex-row justify-start items-center content-center"}>
                    <Image className={"h-10 w-10 -mt-1"} src={Logo} alt={"logo"} />
                    <p className={"ml-4 nohemi text-[#FFFFFF] text-[24px]"}>
                        totem
                    </p>
                </div>
                <ul className={"flex flex-row justify-end items-center content-center"}>
                    <button className={"rounded-[8px] border-none outline-none bg-[#FFFFFF] text-[#121619] flex flex-row justify-center items-center content-center nohemi text-[16px] px-4 py-2"}>
                        <p className={"font-light"}>
                            Launch App
                        </p>
                        <ArrowTopRightIcon className={"h-5 w-5 ml-2 text-[#121619]"} />
                    </button>
                </ul>
            </div>
        </nav>
    );
}