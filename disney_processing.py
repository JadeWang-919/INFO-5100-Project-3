import pandas as pd

# Read the CSV file
df = pd.read_csv("disney_movies_original.csv")

# Extract the year from the release_date column
df["Year"] = df["release_date"].str.split("/").str[2]

# Drop rows with total_gross = 0
df = df[df["total_gross"] != 0]

# Drop the original release_date column
df = df.drop("release_date", axis=1)

# Write the modified DataFrame to a new CSV file
df.to_csv("disney_modified.csv", index=False)
