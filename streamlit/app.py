import streamlit as st
import requests

st.set_page_config(
    page_title="ArchRAG",
    page_icon="🏗️",
    layout="centered"
)

st.title("🏗️ ArchRAG")
st.caption("Architecture Decision Assistant")

st.write(
    "Ask questions about architecture patterns, "
    "engineering standards, and documented decisions."
)

question = st.text_input(
    "Ask an architecture question",
    placeholder="What are the main components of an event-driven architecture?"
)

if st.button("Ask", type="primary") and question:

    with st.spinner("Searching architecture knowledge..."):
        try:
            response = requests.post(
                "https://archrag.onrender.com/ask",
                json={"question": question},
                timeout=60
            )

            response.raise_for_status()
            data = response.json()

            st.subheader("Answer")
            st.write(data["answer"])

            if data.get("sources"):
                st.subheader("Sources")

                for source in data["sources"]:
                    st.markdown(
                        f"[{source['title']}]({source['url']})"
                    )

            if data.get("retrieval"):
                with st.expander("🔍 Retrieval Details"):

                    for i, item in enumerate(data["retrieval"], start=1):

                        st.markdown(f"### Chunk {i}")

                        if item.get("score") is not None:
                            st.write(
                                f"Similarity score: {item['score']:.3f}"
                            )

                        if data.get("sources"):
                            st.subheader("Sources")

                            for source in data["sources"]:
                                title = source.get("title", "Unknown source")
                                url = source.get("url")

                                if url:
                                    st.markdown(f"[{title}]({url})")
                                else:
                                    st.write(f"📄 {title}")
                        st.write(item.get("text", ""))

                        st.divider()

        except requests.RequestException as error:
            st.error(f"Unable to reach ArchRAG backend: {error}")