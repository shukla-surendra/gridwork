import { Stack, Text } from "@chakra-ui/react";

export default function Greeting({ name }) {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    let greeting;
    if (currentHour < 12) {
        greeting = "Good morning";
    } else if (currentHour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

    const formattedDate = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <Stack fontWeight={'bold'}>
            <Text lineHeight="1" fontSize="20px">
                {greeting}, {name} !
            </Text>
            <Text lineHeight="1" fontSize="20px">{formattedDate}</Text>
        </Stack>
    );
}

